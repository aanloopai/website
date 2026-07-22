// Punt D (eindreview #2, important): admin-routes.js routeert de
// statuswijziging naar 'actief' altijd via activateOrder(..., {manual:true}).
// Vóór de activation.js-fix (zie test/activation.test.js) leverde dat voor
// een funnelorder de wacht_op_klant-tussentoestand op, en het adminscherm
// meldde dan altijd dezelfde tekst: "de inrichting is niet afgerond ... Zie
// de alert voor de oorzaak" — een alert die voor wacht_op_klant per ontwerp
// NOOIT wordt verstuurd (spec: dit is een normale toestand, geen storing).
//
// Deze test isoleert precies het admin-niveau van punt D (de melding), los
// van de activation.js-fix zelf: activateOrder wordt hier gemockt, zodat de
// message-selectielogica in updateOrder() op zichzelf wordt vastgelegd,
// onafhankelijk van welke uitkomsten activateOrder vandaag daadwerkelijk kan
// teruggeven via dit call-pad.
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

const activateOrderMock = vi.fn();
vi.mock('../src/lib/activation.js', () => ({
  activateOrder: (...args) => activateOrderMock(...args),
}));

const { updateOrder } = await import('../src/lib/admin-routes.js');

function makeDb(order) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith('SELECT * FROM service_orders WHERE id = ?')) return order;
              throw new Error(`geen .first() voor: ${sql} (${JSON.stringify(args)})`);
            },
            async run() {
              throw new Error(`geen .run() voor: ${sql} (${JSON.stringify(args)})`);
            },
          };
        },
      };
    },
  };
}
function makeRequest(body) {
  return { json: async () => body };
}

beforeEach(() => { activateOrderMock.mockReset(); });

describe('updateOrder — de "actief"-melding matcht wat activateOrder echt teruggeeft', () => {
  it('geeft manual:true door aan activateOrder (dat is de expliciete menselijke handeling)', async () => {
    activateOrderMock.mockResolvedValue({ status: 'actief', serviceId: 'svc_1', provisioned: true });
    const order = { id: 'ord_1', voorstel_id: 'vst_1' };
    const env = { PORTAL_DB: makeDb(order) };

    await updateOrder(makeRequest({ id: 'ord_1', status: 'actief' }), env);

    expect(activateOrderMock).toHaveBeenCalledWith(env, order, { manual: true });
  });

  it('een echte storing (park-uitkomst): de melding verwijst terecht naar de alert', async () => {
    activateOrderMock.mockResolvedValue({ status: 'in_uitvoering', serviceId: 'svc_2', provisioned: false });
    const order = { id: 'ord_2', voorstel_id: null };
    const env = { PORTAL_DB: makeDb(order) };

    const res = await updateOrder(makeRequest({ id: 'ord_2', status: 'actief' }), env);
    const body = await res.json();

    expect(body.status).toBe('in_uitvoering');
    expect(body.message.toLowerCase()).toContain('alert');
  });

  it('wacht_op_klant (self-serve funnel, normale tussentoestand): de melding verwijst NIET naar een alert die nooit verstuurd wordt', async () => {
    activateOrderMock.mockResolvedValue({ status: 'wacht_op_klant', serviceId: 'svc_3', provisioned: true });
    const order = { id: 'ord_3', voorstel_id: 'vst_3' };
    const env = { PORTAL_DB: makeDb(order) };

    const res = await updateOrder(makeRequest({ id: 'ord_3', status: 'actief' }), env);
    const body = await res.json();

    expect(body.status).toBe('wacht_op_klant');
    expect(body.message.toLowerCase()).not.toContain('alert');
  });
});
