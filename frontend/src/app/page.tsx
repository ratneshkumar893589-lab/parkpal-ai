"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Bot, CarFront, CheckCircle2, Clock3, MapPin, Menu, Navigation, Search, ShieldCheck, Sparkles, Wallet, X, Zap } from "lucide-react";
import { api } from "@/lib/api";
import ParkingMap from "@/components/ParkingMap";

type Prediction = { predicted_available: number; availability_probability: number; confidence: string; expected_wait_minutes: number; label: string };
type Lot = {
  id: string; name: string; address: string; lat: number; lng: number; capacity: number; available: number;
  hourly_rate: number; rating: number; security: string; ev_charging: boolean; vehicle_types: string[];
  walking_m: number; kind: string; source: string; distance_km?: number; estimated_drive_minutes?: number;
  total_estimated_cost?: number; recommendation_score?: number; reasons?: string[]; prediction?: Prediction;
};
type Reservation = { booking_id: string; parking_name: string; estimated_total: number; status: string; payment_status: string };

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Home() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [results, setResults] = useState<Lot[]>([]);
  const [destination, setDestination] = useState("Whitefield, Bengaluru");
  const [budget, setBudget] = useState("50");
  const [arrival, setArrival] = useState("20");
  const [vehicle, setVehicle] = useState("car");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Lot | null>(null);
  const [booking, setBooking] = useState<Lot | null>(null);
  const [customer, setCustomer] = useState("Demo Driver");
  const [plate, setPlate] = useState("KA01AB1234");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; text: string }[]>([
    { role: "assistant", text: "Hi! I'm ParkPal Assistant. Ask me to find parking, compare prices or explain arrival predictions. Demo data is being used." }
  ]);
  const [language, setLanguage] = useState("en");
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => { api<{items: Lot[]}>("/api/parking").then(d => { setLots(d.items); setResults(d.items); }).catch(e => setError(e.message)); }, []);

  async function searchParking(e?: React.FormEvent) {
    e?.preventDefault(); setLoading(true); setError(""); setSelected(null);
    try {
      const data = await api<{items: Lot[]}>("/api/recommendations", { method: "POST", body: JSON.stringify({
        destination, arrival_minutes: Number(arrival), duration_hours: 2,
        max_hourly_rate: budget ? Number(budget) : null, vehicle_type: vehicle
      })});
      setResults(data.items);
      if (!data.items.length) setError("No demo locations match those filters. Try increasing your budget.");
    } catch (e) { setError(e instanceof Error ? e.message : "Search failed"); }
    finally { setLoading(false); }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault(); if (!message.trim()) return;
    const text = message; setMessage(""); setChat(c => [...c, { role: "user", text }]);
    try {
      const data = await api<{reply: string}>("/api/assistant", { method: "POST", body: JSON.stringify({ message: text, language }) });
      setChat(c => [...c, { role: "assistant", text: data.reply }]);
    } catch { setChat(c => [...c, { role: "assistant", text: "I couldn't reach the demo server. Please check that the backend is running." }]); }
  }

  async function confirmBooking(e: React.FormEvent) {
    e.preventDefault(); if (!booking) return;
    try {
      const data = await api<Reservation>("/api/reservations", { method: "POST", body: JSON.stringify({
        parking_id: booking.id, customer_name: customer, vehicle_number: plate, duration_hours: 2, confirm: true
      })});
      setReservation(data); setBooking(null);
      const refreshed = await api<{items: Lot[]}>("/api/parking"); setLots(refreshed.items);
      setResults(prev => prev.map(p => p.id === booking.id ? {...p, available: Math.max(0, p.available - 1)} : p));
    } catch (e) { setError(e instanceof Error ? e.message : "Booking failed"); }
  }

  const best = results[0];
  const avgAvailable = useMemo(() => lots.reduce((n, p) => n + p.available, 0), [lots]);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#10284d] text-white"><CarFront size={23}/></span>
            <span className="text-xl font-black tracking-tight text-[#10284d]">ParkPal <span className="text-blue-600">AI</span></span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#find" className="hover:text-blue-600">Find Parking</a><a href="#map" className="hover:text-blue-600">Explore Map</a>
            <a href="#how" className="hover:text-blue-600">How it works</a><a href="#impact" className="hover:text-blue-600">Our impact</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex"><button onClick={() => setAssistantOpen(true)} className="rounded-full px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"> <Bot className="mr-1 inline" size={17}/> AI Assistant</button><a href="#find" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Get started <ArrowUpRight className="ml-1 inline" size={16}/></a></div>
          <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
        </div>
        {mobileMenu && <div className="grid gap-3 border-t px-5 py-4 text-sm md:hidden"><a href="#find" onClick={() => setMobileMenu(false)}>Find Parking</a><a href="#map" onClick={() => setMobileMenu(false)}>Explore Map</a><button onClick={() => {setAssistantOpen(true);setMobileMenu(false)}} className="text-left">AI Assistant</button></div>}
      </header>

      <section className="relative overflow-hidden bg-[#0b1932] text-white">
        <div className="pointer-events-none absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-blue-500/20 blur-3xl"/>
        <div className="pointer-events-none absolute -bottom-64 left-1/4 h-[500px] w-[500px] rounded-full bg-teal-400/10 blur-3xl"/>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-[1.05fr_.95fr] md:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-300/10 px-4 py-2 text-xs font-bold tracking-wide text-blue-200"><Sparkles size={14}/> SMARTER PARKING STARTS HERE</div>
            <h1 className="max-w-2xl text-5xl font-black leading-[1.08] tracking-tight md:text-6xl">Find your perfect parking spot <span className="text-[#65d9c4]">before you arrive.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">AI-powered recommendations that look beyond what's free right now — and estimate what may still be available when you get there.</p>
            <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-300"><span className="flex items-center gap-2"><CheckCircle2 className="text-teal-300" size={17}/> Arrival-time predictions</span><span className="flex items-center gap-2"><CheckCircle2 className="text-teal-300" size={17}/> Smarter recommendations</span></div>
            <div className="mt-10 flex items-center gap-4"><div className="flex -space-x-2"><span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#0b1932] bg-teal-300 text-xs font-black text-slate-900">AI</span><span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#0b1932] bg-blue-300 text-xs font-black text-slate-900">P</span><span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#0b1932] bg-violet-300 text-xs font-black text-slate-900">+</span></div><p className="text-xs text-slate-400">A smarter way to use the parking already around us.</p></div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-teal-300/10 blur-2xl"/>
            <div className="relative rounded-[2rem] border border-white/15 bg-white p-3 shadow-2xl shadow-black/30">
              <div className="overflow-hidden rounded-[1.4rem] bg-slate-100">
                <div className="flex items-center justify-between px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your parking snapshot</p><p className="mt-1 font-extrabold text-slate-900">Whitefield, Bengaluru</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Demo mode</span></div>
                <div className="relative h-56 overflow-hidden bg-[#e3eee9]">
                  <div className="absolute inset-0 opacity-70" style={{backgroundImage:"linear-gradient(35deg,transparent 46%,#fff 47%,#fff 51%,transparent 52%),linear-gradient(110deg,transparent 42%,#fff 43%,#fff 47%,transparent 48%),linear-gradient(0deg,transparent 48%,#fff 49%,#fff 53%,transparent 54%)",backgroundSize:"160px 130px"}}/>
                  <div className="absolute left-[20%] top-[24%] rounded-full bg-blue-600 p-3 text-white shadow-xl"><MapPin/></div><div className="absolute left-[58%] top-[52%] rounded-full bg-emerald-500 p-3 text-white shadow-xl"><CarFront/></div><div className="absolute right-[15%] top-[17%] rounded-full bg-amber-400 p-2.5 text-slate-900 shadow-xl"><MapPin/></div>
                  <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow">AI recommended route</div>
                </div>
                <div className="grid grid-cols-3 gap-2 p-3">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Listed lots</p><p className="mt-1 text-xl font-black text-slate-900">{lots.length || "—"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Free now</p><p className="mt-1 text-xl font-black text-emerald-600">{avgAvailable || "—"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Arrival</p><p className="mt-1 text-xl font-black text-blue-600">20 min</p></div>
                </div>
                <p className="px-4 pb-3 text-[10px] text-slate-400">Illustrative interface · sample parking data</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="find" className="relative z-10 mx-auto -mt-8 max-w-7xl px-5">
        <form onSubmit={searchParking} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft md:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Start your search</p><h2 className="mt-1 text-2xl font-black text-slate-900">Where are you heading?</h2></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500"><MapPin size={13} className="mr-1 inline"/> Bengaluru demo area</span></div>
          <div className="grid gap-4 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-500">DESTINATION</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 focus-within:border-blue-500"><MapPin size={18} className="shrink-0 text-blue-600"/><input value={destination} onChange={e => setDestination(e.target.value)} className="w-full min-w-0 bg-transparent text-sm font-semibold outline-none" placeholder="Enter destination"/></span></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-500">ARRIVAL IN</span><select value={arrival} onChange={e => setArrival(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-blue-500"><option value="10">10 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-500">MAX ₹ / HOUR</span><span className="flex items-center rounded-xl border border-slate-200 px-3 py-3"><Wallet size={17} className="mr-2 text-slate-400"/><input type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-transparent text-sm font-semibold outline-none"/></span></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-500">VEHICLE</span><select value={vehicle} onChange={e => setVehicle(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-blue-500"><option value="car">Car</option><option value="bike">Bike</option></select></label>
            <button disabled={loading} className="self-end rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60"><Search size={17} className="mr-2 inline"/>{loading ? "Searching…" : "Find parking"}</button>
          </div>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">AI-powered discovery</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Parking picks for your arrival</h2><p className="mt-2 text-sm text-slate-500">Ranked by estimated availability, distance, budget and fit.</p></div><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Sample data · not live inventory</span></div>
        {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-4">
            {results.map((lot, i) => <article key={lot.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${i === 0 ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><CarFront size={23}/></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900">{lot.name}</h3>{i === 0 && <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black uppercase text-white">Best match</span>}</div><p className="mt-1 text-xs text-slate-500">{lot.address}</p></div></div><div className="text-right"><p className="text-xl font-black text-slate-900">{money(lot.hourly_rate)}<span className="text-xs font-semibold text-slate-400">/hr</span></p><p className="text-xs text-slate-500">Est. {money(lot.hourly_rate * 2)} / 2 hrs</p></div></div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Available now</p><p className="mt-1 text-lg font-black text-slate-900">{lot.available}/{lot.capacity}</p></div>
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase text-emerald-700">At arrival</p><p className="mt-1 text-lg font-black text-emerald-800">{lot.prediction?.predicted_available ?? "—"} slots</p></div>
                <div className="rounded-xl bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase text-blue-700">Find probability</p><p className="mt-1 text-lg font-black text-blue-800">{Math.round((lot.prediction?.availability_probability || 0) * 100)}%</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Walk</p><p className="mt-1 text-lg font-black text-slate-900">{lot.walking_m} m</p></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"><span><Clock3 size={14} className="mr-1 inline"/>~{lot.estimated_drive_minutes || 8} min drive (demo)</span><span>★ {lot.rating.toFixed(1)} rating (sample)</span><span><ShieldCheck size={14} className="mr-1 inline"/>{lot.security}</span>{lot.ev_charging && <span><Zap size={14} className="mr-1 inline"/>EV charging listed</span>}</div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><div><p className="text-xs font-bold text-slate-700">Why this recommendation?</p><p className="mt-1 text-xs text-slate-500">{lot.reasons?.join(" · ") || "Matches your search"}</p><p className="mt-1 text-[10px] text-amber-700">Confidence: {lot.prediction?.confidence || "Simulated"} · {lot.prediction?.label || "SIMULATED"}</p></div><div className="flex gap-2"><button onClick={() => setSelected(lot)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Details</button><button onClick={() => {setBooking(lot);setReservation(null)}} className="rounded-xl bg-[#10284d] px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700">Reserve <ArrowRight className="ml-1 inline" size={14}/></button></div></div>
            </article>)}
            {!results.length && !loading && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Search to see matching sample parking locations.</div>}
          </div>
          <div id="map" className="h-[550px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-24"><div className="flex items-center justify-between px-3 py-3"><div><h3 className="font-extrabold text-slate-900">Explore parking map</h3><p className="text-xs text-slate-500">Sample locations around Whitefield</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Map preview</span></div><div className="h-[470px] overflow-hidden rounded-2xl"><ParkingMap lots={results.length ? results : lots} onSelect={id => setSelected((results.length ? results : lots).find(p => p.id === id) || null)}/></div></div>
        </div>
      </section>

      <section id="how" className="bg-white py-20"><div className="mx-auto max-w-7xl px-5"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Simple by design</p><h2 className="mt-2 text-3xl font-black text-slate-900">A better parking journey in three steps</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[{n:"01",icon:<Search/>,title:"Tell us where you're going",body:"Share your destination, arrival window, vehicle and budget."},{n:"02",icon:<Sparkles/>,title:"Let AI compare your options",body:"Explore recommendations that consider estimated availability when you arrive."},{n:"03",icon:<Navigation/>,title:"Choose and reserve",body:"Review the details and confirm a demo reservation when you're ready."}].map(x=><div key={x.n} className="rounded-2xl border border-slate-200 p-7"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">{x.icon}</span><span className="text-3xl font-black text-slate-100">{x.n}</span></div><h3 className="mt-6 text-lg font-extrabold text-slate-900">{x.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{x.body}</p></div>)}</div></div></section>

      <section id="impact" className="bg-[#0b1932] py-16 text-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-black uppercase tracking-[.18em] text-teal-300">Built with purpose · SDG 11</p><h2 className="mt-3 max-w-2xl text-3xl font-black">Make better use of the parking spaces cities already have.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">By helping drivers compare suitable spaces before they arrive, ParkPal AI aims to reduce unnecessary circling, improve parking utilization and support more sustainable communities.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-6"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-300 text-[#0b1932]"><Zap/></span><div><p className="font-extrabold">SDG 11</p><p className="text-xs text-slate-300">Sustainable Cities & Communities</p></div></div></div></div></section>

      <footer className="bg-white px-5 py-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><div className="font-black text-[#10284d]">ParkPal <span className="text-blue-600">AI</span></div><p className="text-xs text-slate-500">© 2026 ParkPal AI · Demonstration project · Sample data only</p><button onClick={() => setAssistantOpen(true)} className="text-xs font-bold text-blue-700">Ask ParkPal Assistant</button></div></footer>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setSelected(null)}><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase text-blue-600">Parking details</p><h3 className="mt-1 text-xl font-black">{selected.name}</h3></div><button onClick={() => setSelected(null)}><X/></button></div><p className="mt-2 text-sm text-slate-500">{selected.address}</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Hourly rate</p><b>{money(selected.hourly_rate)}</b></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Predicted spaces</p><b>{selected.prediction?.predicted_available ?? "—"}</b></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Availability chance</p><b>{Math.round((selected.prediction?.availability_probability || 0)*100)}%</b></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Walking distance</p><b>{selected.walking_m} m</b></div></div><p className="mt-4 text-xs text-amber-700">All details are simulated demo data and are not a real parking guarantee.</p><button onClick={() => {setBooking(selected);setSelected(null)}} className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-bold text-white">Continue to reservation</button></div></div>}

      {booking && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setBooking(null)}><form onSubmit={confirmBooking} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase text-blue-600">Reservation confirmation</p><h3 className="mt-1 text-xl font-black">{booking.name}</h3></div><button type="button" onClick={() => setBooking(null)}><X/></button></div><p className="mt-2 text-sm text-slate-500">2-hour demo reservation · Estimated {money(booking.hourly_rate*2)}</p><label className="mt-5 block text-xs font-bold text-slate-600">YOUR NAME<input required minLength={2} value={customer} onChange={e => setCustomer(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"/></label><label className="mt-4 block text-xs font-bold text-slate-600">VEHICLE NUMBER<input required minLength={4} value={plate} onChange={e => setPlate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm uppercase outline-none focus:border-blue-500"/></label><div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">This is a demonstration reservation only. No real parking space is held and no payment will be charged. Confirm only to test the demo flow.</div><button className="mt-5 w-full rounded-xl bg-[#10284d] py-3 font-bold text-white">Confirm demo reservation</button></form></div>}

      {reservation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setReservation(null)}><div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl" onClick={e => e.stopPropagation()}><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={30}/></span><h3 className="mt-4 text-2xl font-black">Demo booking created</h3><p className="mt-2 text-sm text-slate-500">{reservation.parking_name}</p><div className="my-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Booking reference</p><p className="mt-1 text-2xl font-black tracking-widest text-[#10284d]">{reservation.booking_id}</p><p className="mt-3 text-sm font-bold">{money(reservation.estimated_total)}</p></div><p className="text-xs text-amber-700">{reservation.payment_status}. This is not a real reservation or payment.</p><button onClick={() => setReservation(null)} className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-bold text-white">Done</button></div></div>}

      <button onClick={() => setAssistantOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-900/25 transition hover:-translate-y-1"><Bot size={20}/> ParkPal Assistant</button>
      {assistantOpen && <div className="fixed bottom-24 right-5 z-50 flex h-[470px] w-[min(390px,calc(100vw-40px))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between bg-[#10284d] px-4 py-4 text-white"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Bot/></span><div><p className="font-extrabold">ParkPal Assistant</p><p className="text-[10px] text-blue-200">Multilingual · Demo assistant</p></div></div><button onClick={() => setAssistantOpen(false)}><X/></button></div><div className="flex items-center justify-between border-b px-4 py-2"><span className="text-xs font-bold text-slate-500">Language</span><select value={language} onChange={e => setLanguage(e.target.value)} className="rounded-lg border px-2 py-1 text-xs"><option value="en">English</option><option value="hi">हिन्दी</option><option value="kn">ಕನ್ನಡ</option></select></div><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">{chat.map((m,i)=><div key={i} className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-6 ${m.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-white text-slate-700 shadow-sm"}`}>{m.text}</div>)}</div><form onSubmit={sendChat} className="flex gap-2 border-t bg-white p-3"><input value={message} onChange={e => setMessage(e.target.value)} placeholder="Ask about parking…" className="min-w-0 flex-1 rounded-xl bg-slate-100 px-3 py-3 text-sm outline-none"/><button className="rounded-xl bg-blue-600 px-4 text-white"><ArrowRight/></button></form></div>}
    </main>
  );
}
