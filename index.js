import {randomBytes} from 'node:crypto';
import {Activity} from './lib/activity.js';
import {activityHandler} from './lib/http.js';

export const inject = ['webServer'];

export function apply(ctx) {
  const activity = new Activity();
  const token = randomBytes(32).toString('hex');
  const path = '/plugins/dsh-activity-indicators/activity';
  let scheduler;
  ctx.inject(['modelScheduler'], scope => {
    scheduler = scope.get('modelScheduler');
    scope.effect(() => () => { scheduler = undefined; });
  });
  ctx.on('agent/assistant-stream', ({agent, frame}) => activity.frame(agent.id, frame), {global: true});
  ctx.on('agent/status', ({agent, status}) => { if (status !== 'running') activity.clear(agent.id); }, {global: true});
  ctx.on('agent/disposed', ({agent}) => activity.clear(agent.id), {global: true});
  ctx.on('session/event', (session, event) => {
    if (event.type === 'turn/end') activity.clear(session.id);
  }, {global: true});
  ctx.on('webserver/index-inject', table => table.push({kind:'global', name:'__DSH_ACTIVITY_INDICATORS__', value:{path, token}}));
  ctx.effect(() => ctx.webServer.register({kind:'exact', path,
    handler: activityHandler(token, () => ctx.webServer.getOrigin(), () => activity.snapshot(scheduler?.activityStatus?.()))
  }));
  ctx.effect(() => () => activity.attempts.clear());
}
