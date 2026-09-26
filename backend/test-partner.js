// E2E test for booth partner (合摊) feature — runs real server against in-memory MongoDB
const { spawn } = require('child_process');
const { MongoMemoryServer } = require('mongodb-memory-server');

const API = 'http://localhost:8219/api';
let passed = 0, failed = 0;

function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { status: res.status, data };
}

async function register(username, email, role = 'vendor') {
  const r = await api('POST', '/auth/register', { body: { username, email, password: 'secret123', role } });
  if (!r.data?.token) throw new Error(`register ${username} failed: ${JSON.stringify(r.data)}`);
  return r.data;
}

(async () => {
  const mongod = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
    instance: { port: 27017, dbName: 'anime-expo' }
  });
  console.log('mongod up:', mongod.getUri());

  const server = spawn('node', ['server.js'], { cwd: __dirname, stdio: 'pipe' });
  server.stderr.on('data', d => process.stderr.write(d));
  await new Promise(r => setTimeout(r, 2500));

  try {
    // ---- setup users ----
    const owner = await register('owner1', 'owner@test.com');
    const partner = await register('partner1', 'partner@test.com');
    const third = await register('third1', 'third@test.com');
    const admin = await register('admin1', 'admin@test.com', 'admin');

    // ---- expo + booth ----
    const expo = (await api('POST', '/expos', {
      token: admin.token,
      body: { name: '测试漫展', description: 'desc', startDate: '2026-10-01', endDate: '2026-10-03' }
    })).data;
    console.log('\n== 基本流程 ==');

    // invite on pending booth -> rejected
    const boothRes = await api('POST', '/booths', {
      token: owner.token,
      body: { name: '同人本摊', description: '原创同人本', products: '本子、吧唧', expoId: expo._id, positionPreference: '靠窗' }
    });
    const booth = boothRes.data;

    let r = await api('POST', `/booths/${booth._id}/invite`, { token: owner.token, body: { email: 'partner@test.com' } });
    check('未通过审核的摊位不能邀请', r.status === 400 && r.data.message.includes('通过审核'), JSON.stringify(r.data));

    // approve
    r = await api('PUT', `/booths/${booth._id}/approve`, { token: admin.token, body: { zone: null, position: { x: 1, y: 1 } } });
    check('管理员审核通过', r.status === 200 && r.data.status === 'approved');

    // invite: unregistered email
    r = await api('POST', `/booths/${booth._id}/invite`, { token: owner.token, body: { email: 'ghost@test.com' } });
    check('邀请未注册邮箱提示失败原因', r.status === 400 && r.data.message.includes('尚未注册'), JSON.stringify(r.data));

    // invite: self
    r = await api('POST', `/booths/${booth._id}/invite`, { token: owner.token, body: { email: 'owner@test.com' } });
    check('不能邀请自己', r.status === 400 && r.data.message.includes('自己'), JSON.stringify(r.data));

    // invite: non-owner
    r = await api('POST', `/booths/${booth._id}/invite`, { token: third.token, body: { email: 'partner@test.com' } });
    check('非摊主不能邀请', r.status === 403, JSON.stringify(r.data));

    // invite: success
    r = await api('POST', `/booths/${booth._id}/invite`, { token: owner.token, body: { email: 'Partner@Test.com ' } });
    check('邀请成功（邮箱大小写/空格归一化）', r.status === 200 && r.data.booth.partnerInvite.email === 'partner@test.com', JSON.stringify(r.data));

    // duplicate invite same email
    r = await api('POST', `/booths/${booth._id}/invite`, { token: owner.token, body: { email: 'partner@test.com' } });
    check('重复邀请同一伙伴提示原因', r.status === 400 && r.data.message.includes('已邀请过'), JSON.stringify(r.data));

    // invite another while pending
    r = await api('POST', `/booths/${booth._id}/invite`, { token: owner.token, body: { email: 'third@test.com' } });
    check('有待确认邀请时邀请他人提示先撤回', r.status === 400 && r.data.message.includes('先撤回'), JSON.stringify(r.data));

    // invitee sees progress
    r = await api('GET', '/booths/invites/received', { token: partner.token });
    check('被邀请人能看到邀请进展', r.status === 200 && r.data.length === 1 && r.data[0].ownerId.username === 'owner1' && r.data[0].expoId.name === '测试漫展', JSON.stringify(r.data));
    r = await api('GET', '/booths/invites/received', { token: third.token });
    check('无关用户没有邀请', r.status === 200 && r.data.length === 0);

    // third user cannot accept
    r = await api('POST', `/booths/${booth._id}/invite/accept`, { token: third.token });
    check('非被邀请人不能接受', r.status === 400, JSON.stringify(r.data));

    // partner cannot edit before accepting
    r = await api('PUT', `/booths/${booth._id}`, { token: partner.token, body: { description: 'hack' } });
    check('接受前伙伴不能改介绍', r.status === 403, JSON.stringify(r.data));

    // accept
    r = await api('POST', `/booths/${booth._id}/invite/accept`, { token: partner.token });
    check('接受邀请成功', r.status === 200 && String(r.data.booth.partnerId) === String(partner.user.id), JSON.stringify(r.data));

    // invite after partner exists
    r = await api('POST', `/booths/${booth._id}/invite`, { token: owner.token, body: { email: 'third@test.com' } });
    check('已有伙伴时再邀请提示原因', r.status === 400 && r.data.message.includes('已有合摊伙伴'), JSON.stringify(r.data));

    // withdraw after accept
    r = await api('DELETE', `/booths/${booth._id}/invite`, { token: owner.token });
    check('接受后撤回提示无法撤回', r.status === 400 && r.data.message.includes('无法撤回'), JSON.stringify(r.data));

    // accept again
    r = await api('POST', `/booths/${booth._id}/invite/accept`, { token: partner.token });
    check('重复接受提示已有伙伴', r.status === 400 && r.data.message.includes('已有合摊伙伴'), JSON.stringify(r.data));

    // both can edit
    r = await api('PUT', `/booths/${booth._id}`, { token: owner.token, body: { description: '摊主改的介绍' } });
    check('摊主可改介绍', r.status === 200 && r.data.description === '摊主改的介绍');
    r = await api('PUT', `/booths/${booth._id}`, { token: partner.token, body: { products: '伙伴改的商品清单', positionPreference: '入口附近' } });
    check('伙伴可改商品清单和位置偏好', r.status === 200 && r.data.products === '伙伴改的商品清单' && r.data.positionPreference === '入口附近', JSON.stringify(r.data));
    r = await api('PUT', `/booths/${booth._id}`, { token: third.token, body: { description: 'x' } });
    check('无关用户不能改', r.status === 403);

    // my booth for partner
    r = await api('GET', `/booths/my/${expo._id}`, { token: partner.token });
    check('伙伴在我的摊位里看到合摊摊位', r.status === 200 && r.data && r.data._id === booth._id && r.data.ownerId.username === 'owner1' && r.data.partnerId.username === 'partner1', JSON.stringify(r.data));

    // expo booth list shows both nicknames
    r = await api('GET', `/booths/expo/${expo._id}`);
    check('展会摊位列表显示双方昵称', r.status === 200 && r.data[0].ownerId.username === 'owner1' && r.data[0].partnerId.username === 'partner1', JSON.stringify(r.data));

    // booth detail shows both
    r = await api('GET', `/booths/${booth._id}`);
    check('摊位详情显示双方昵称', r.status === 200 && r.data.ownerId.username === 'owner1' && r.data.partnerId.username === 'partner1');

    // other applications unaffected: third user applies normally
    r = await api('POST', '/booths', { token: third.token, body: { name: '另一个摊', description: 'd', products: 'p', expoId: expo._id } });
    check('其他用户申请照常', r.status === 201 && r.data.status === 'pending');
    r = await api('GET', '/booths/pending', { token: admin.token });
    check('审核列表照常', r.status === 200 && r.data.some(b => b.name === '另一个摊'));

    console.log('\n== 并发：撤回与接受同时到达 ==');
    // second booth for race test
    const booth2 = (await api('POST', '/booths', { token: owner.token, body: { name: '竞速摊', description: 'd', products: 'p', expoId: expo._id } })).data;
    await api('PUT', `/booths/${booth2._id}/approve`, { token: admin.token, body: {} });
    await api('POST', `/booths/${booth2._id}/invite`, { token: owner.token, body: { email: 'partner@test.com' } });

    const [wr, ar] = await Promise.all([
      api('DELETE', `/booths/${booth2._id}/invite`, { token: owner.token }),
      api('POST', `/booths/${booth2._id}/invite/accept`, { token: partner.token })
    ]);
    const successes = [wr, ar].filter(x => x.status === 200).length;
    check('撤回与接受并发只有一个成功', successes === 1, `withdraw=${wr.status} accept=${ar.status}`);

    const final = (await api('GET', `/booths/${booth2._id}`)).data;
    const inviteGone = !final.partnerInvite || !final.partnerInvite.inviteeId;
    check('邀请最终状态一致（无悬挂邀请）', inviteGone, JSON.stringify(final.partnerInvite));
    if (ar.status === 200) {
      check('接受先完成：伙伴已绑定', String(final.partnerId?._id || final.partnerId) === String(partner.user.id));
    } else {
      check('撤回先完成：无伙伴绑定', !final.partnerId);
      const r2 = await api('POST', `/booths/${booth2._id}/invite/accept`, { token: partner.token });
      check('撤回后再接受提示已被撤回', r2.status === 400 && r2.data.message.includes('撤回'), JSON.stringify(r2.data));
    }

    // withdraw flow normal: invite then withdraw then re-invite
    const booth3 = (await api('POST', '/booths', { token: owner.token, body: { name: '撤回摊', description: 'd', products: 'p', expoId: expo._id } })).data;
    await api('PUT', `/booths/${booth3._id}/approve`, { token: admin.token, body: {} });
    await api('POST', `/booths/${booth3._id}/invite`, { token: owner.token, body: { email: 'partner@test.com' } });
    r = await api('DELETE', `/booths/${booth3._id}/invite`, { token: owner.token });
    check('摊主可撤回待确认邀请', r.status === 200);
    r = await api('POST', `/booths/${booth3._id}/invite/accept`, { token: partner.token });
    check('撤回后接受提示已被撤回', r.status === 400 && r.data.message.includes('撤回'), JSON.stringify(r.data));
    r = await api('POST', `/booths/${booth3._id}/invite`, { token: owner.token, body: { email: 'third@test.com' } });
    check('撤回后可再邀请他人', r.status === 200);
    r = await api('DELETE', `/booths/${booth3._id}/invite`, { token: owner.token });
    check('再次撤回新邀请成功', r.status === 200);
    r = await api('DELETE', `/booths/${booth3._id}/invite`, { token: owner.token });
    check('重复撤回提示没有待撤回邀请', r.status === 400 && r.data.message.includes('没有待撤回'), JSON.stringify(r.data));
  } catch (e) {
    failed++;
    console.error('测试异常:', e);
  } finally {
    server.kill();
    await mongod.stop();
  }

  console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
  process.exit(failed ? 1 : 0);
})();
