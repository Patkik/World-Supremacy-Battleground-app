"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui";

export default function ResultsDirectoryPage() {
  const [eventId, setEventId] = useState(""); const [error, setError] = useState(""); const router = useRouter();
  function open(event: FormEvent) { event.preventDefault(); const value = eventId.trim(); if (!value || value.length > 200 || value.includes("/") || value === "." || value === "..") { setError("Enter a valid event reference."); return; } setError(""); router.push(`/events/${encodeURIComponent(value)}/results`); }
  return <main id="main-content" className="section-wrap"><PageHeading title="Published results" description="Open results for an event after they have been published by authorized staff." /><section className="panel max-w-3xl"><h2>Find an event</h2><p>Enter the event reference supplied by your event organizer.</p><form onSubmit={open}><label htmlFor="results-event-id">Event reference</label><input id="results-event-id" value={eventId} onChange={event => setEventId(event.target.value)} required />{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-volt" type="submit">Open results</button></form><Link className="text-link" href="/events">Browse events</Link></section></main>;
}
