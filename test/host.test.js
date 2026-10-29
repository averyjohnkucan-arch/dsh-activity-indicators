import test from 'node:test';
import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import {Readable} from 'node:stream';
import {apply} from '../index.js';

test('Cordis hooks, optional scheduler lifecycle and HTTP capability', async t => {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  let route;
  ctx.provide('webServer',{register:r=>{route=r;return()=>{};},getOrigin:()=> 'http://localhost:3080'});
  await ctx.plugin({name:'dsh-activity-indicators',apply});
  const table=[]; ctx.emit('webserver/index-inject',table);
  const {token}=table[0].value;
  const agent={id:'chat'};
  ctx.emit('agent/assistant-stream',{agent,frame:{type:'start',attemptId:'one'}});
  async function call(extra={},body='{}') {
    const req=Readable.from([Buffer.from(body)]);
    Object.assign(req,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',origin:'http://localhost:3080'},...extra});
    const res={headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(code){this.status=code;},end(body){this.body=JSON.parse(body);}};
    await route.handler(req,res);return res;
  }
  assert.deepEqual((await call()).body.result.prefillingSessionIds,['chat']);
  const drop=ctx.provide('modelScheduler',{activityStatus:()=>({directSessionIds:[],directGeneratingSessionIds:[]})});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual((await call()).body.result.prefillingSessionIds,[]);
  await drop();
  assert.deepEqual((await call()).body.result.prefillingSessionIds,['chat']);
  ctx.emit('agent/assistant-stream',{agent,frame:{type:'chunk',attemptId:'one',chunk:{type:'reasoning-delta',text:'x'}}});
  assert.deepEqual((await call()).body.result.generatingSessionIds,['chat']);
  ctx.emit('agent/status',{agent,status:'idle'});
  assert.deepEqual((await call()).body.result.generatingSessionIds,[]);
  assert.equal((await call({headers:{}})).status,401);
  assert.equal((await call({method:'GET'})).status,405);
  assert.equal((await call({headers:{authorization:'Bearer '+token,'content-type':'application/json',origin:'http://other'}})).status,403);
  assert.equal((await call({},'a'.repeat(1025))).status,413);
  assert.equal((await call()).headers['Cache-Control'],'no-store');
});
