"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main id="main-content" className="section-wrap py-12">
      <PageHeading
        eyebrow="Global Communications"
        title="Contact WSB Secretariat"
        description="Connect with chapter operations directors, event technical staff, or global championship organizers."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="col-span-2 panel p-8">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <span className="text-4xl text-volt block">✓</span>
              <h2 className="text-2xl font-bold text-chrome">Inquiry Received</h2>
              <p className="text-sm text-titanium max-w-md mx-auto">
                Thank you for reaching out. A representative from the World Supremacy Battlegrounds Secretariat will review your inquiry and follow up via email within 24 hours.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                  setSubject("");
                }}
                className="button button-volt"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xl font-bold text-chrome mb-2">Send an Official Inquiry</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-chrome mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-chrome mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Subject / Event of Interest</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Media accreditation for Hong Kong World Championship"
                  required
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <button type="submit" className="button button-volt">
                Send Message <Arrow />
              </button>
            </form>
          )}
        </div>

        <aside className="panel p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-chrome mb-2">Secretariat Headquarters</h3>
            <p className="text-xs text-titanium leading-relaxed">
              World Supremacy Battlegrounds International Governance Board<br />
              Sydney & Manila Operations Hubs
            </p>
          </div>

          <div className="space-y-3 text-xs border-t border-subtle pt-4">
            <div>
              <span className="text-titanium block">General Inquiries:</span>
              <strong className="mono text-volt">contact@worldsupremacybattlegrounds.com</strong>
            </div>
            <div>
              <span className="text-titanium block">Media & Broadcasting:</span>
              <strong className="mono text-chrome">press@worldsupremacybattlegrounds.com</strong>
            </div>
            <div>
              <span className="text-titanium block">Emergency Event Desk:</span>
              <strong className="mono text-chrome">+63 (2) 8800-WSB1</strong>
            </div>
          </div>

          <div className="border-t border-subtle pt-4">
            <Link href="/help" className="text-link text-xs">
              Frequently Asked Questions <Arrow diagonal />
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}