"use client";
import { useEffect, useState } from "react";
import { connectedRequest, segment } from "@/lib/connected-api";
import { formatMinorCurrency } from "@/lib/money";
import { registrationCommand } from "@/lib/registration-command";

type Reservation = { id: string; operation_id: string; amount_minor: number; requested_amount_minor: number | null; currency: string; session_id: string | null; cancelled: boolean; settled: boolean };
type Page = { items: Reservation[]; next_page: string | null };
export function LocalPaymongoCheckout({ chapter, eventId, entryId, uid, onChanged }: { chapter: string; eventId: string; entryId: string; uid: string; onChanged: () => void }) {
  const base = `/v1/chapters/${segment(chapter)}/events/${segment(eventId)}/entries/${segment(entryId)}`;
  const [items,setItems] = useState<Reservation[]>([]);
  const [cursor,setCursor] = useState<string | null>(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  async function load(next?: string) {
    setLoading(true); setError("");
    try { const query=new URLSearchParams({limit:"50",...(next?{cursor:next}:{})}); const page=await connectedRequest<Page>(`${base}/local-checkout?${query}`,undefined,"GET",uid);setItems(current=>next?[...current,...page.items]:page.items);setCursor(page.next_page); }
    catch(reason) { setItems([]);setCursor(null);setError(reason instanceof Error?reason.message:"Unable to load test checkouts."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{void load();},[base,uid]);
  async function start() {
    setBusy(true);setError("");setNotice("");
    try { await registrationCommand<Reservation>(`${base}/local-checkout`,{},"POST",false,uid);setNotice("Test checkout reserved. No real payment was made.");onChanged();await load(); }
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to start test checkout.");}finally{setBusy(false);}
  }
  async function action(item: Reservation, cancel: boolean) {
    setBusy(true);setError("");setNotice("");
    try { await connectedRequest<Reservation>(`${base}/${cancel?"local-checkout-cancel":"local-checkout"}`,{operation_id:item.operation_id,...(!cancel?{amount_minor:item.requested_amount_minor}: {})},"POST",uid);setNotice(cancel?"Test checkout cancelled and reservation released.":"Test checkout creation retried.");onChanged();await load(); }
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to update test checkout.");}finally{setBusy(false);}
  }
  async function simulate(item: Reservation) {
    setBusy(true);setError("");setNotice("");
    try { await connectedRequest<Reservation>(`${base}/local-checkout-simulate`,{operation_id:item.operation_id},"POST",uid);setNotice("Simulated payment settled locally. No real money moved.");onChanged();await load(); }
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to complete test payment.");}finally{setBusy(false);}
  }
  return <section className="panel local-paymongo-checkout"><h2>PayMongo local test</h2><p>This is a simulation. It reserves the available test balance but does not charge a payment or mark the entry paid.</p>
    <button type="button" className="button button-volt" style={{minHeight:56}} disabled={busy || loading} onClick={()=>void start()}>Start test checkout</button>
    <button type="button" className="button button-outline" style={{minHeight:56}} disabled={busy || loading} onClick={()=>void load()}>Refresh test checkouts</button>
    {loading?<p role="status">Loading test checkouts…</p>:items.length===0?<p>No test checkouts on this page.</p>:<ul className="connected-list">{items.map(item=><li key={item.id}><strong>{formatMinorCurrency(item.amount_minor,item.currency)}</strong><p>{item.cancelled?"Cancelled":item.settled?"Simulated payment settled":item.session_id?"Reserved · test session ready":"Reserved · session not ready"}</p>{!item.cancelled && !item.settled && <button type="button" className="button button-outline" style={{minHeight:56}} disabled={busy} onClick={()=>void action(item,!!item.session_id)}>{item.session_id?"Cancel test checkout":"Retry session creation"}</button>}{!item.cancelled && !item.settled && item.session_id && <button type="button" className="button button-volt" style={{minHeight:56}} disabled={busy} onClick={()=>void simulate(item)}>Simulate successful payment</button>}</li>)}</ul>}
    {!loading && !error && items.length === 0 && <p>{cursor ? "No test checkouts on this page. Load more to continue." : "No test checkouts for this entry."}</p>}
    {cursor && <button type="button" className="button button-outline" disabled={busy || loading} onClick={()=>void load(cursor)}>Load more test checkouts</button>}
    {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>;
}
