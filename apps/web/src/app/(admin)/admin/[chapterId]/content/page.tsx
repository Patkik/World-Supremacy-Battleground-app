"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, Input, Textarea, StatCard } from "@/components/ui";

export default function ChapterContentManagementPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);

  const [articles, setArticles] = useState([
    {
      id: "art-1",
      title: "Mall of Asia Arena Venue Entry & Parking Advisory for Manila Session",
      category: "Venue Advisory",
      author: "Marcus Vance",
      date: "October 28, 2026",
      status: "Published",
      tone: "volt" as const,
    },
    {
      id: "art-2",
      title: "Monster Crew Warm-up Studio Scheduling & Rehearsal Slots",
      category: "Dancer Notice",
      author: "Elena Rivera",
      date: "October 26, 2026",
      status: "Published",
      tone: "volt" as const,
    },
    {
      id: "art-3",
      title: "Philippine National Finals 2027 Seed Allocation Framework",
      category: "Rule Clarification",
      author: "Ken Swift",
      date: "October 14, 2026",
      status: "Draft",
      tone: "neutral" as const,
    },
  ]);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [adding, setAdding] = useState(false);

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const item = {
      id: `art-${Date.now()}`,
      title: newTitle,
      category: "Chapter Announcement",
      author: "Chapter Administrator",
      date: new Date().toLocaleDateString(),
      status: "Published",
      tone: "volt" as const,
    };
    setArticles([item, ...articles]);
    setNewTitle("");
    setNewBody("");
    setAdding(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Chapter / ${chapterId.toUpperCase()} / Publishing`}
          title="Local Content & Chapter Communications"
          description={`Publish announcements, dancer advisories, and local venue guidelines for ${chapterId.toUpperCase()} regional participants.`}
        />
        <Button
          variant="primary"
          onClick={() => setAdding(!adding)}
          style={{ minHeight: "48px" }}
        >
          {adding ? "Cancel Notice" : "Compose New Announcement"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Published Notices" value={articles.filter(a => a.status === "Published").length.toString()} meta="Live on chapter portal" tone="volt" />
        <StatCard label="Draft Notices" value={articles.filter(a => a.status === "Draft").length.toString()} meta="Pending review" tone="amber" />
        <StatCard label="Distribution" value="Dancers & Public" meta="Automated push" />
        <StatCard label="Audience Reach" value="4,200 Accounts" meta="In Chapter Territory" tone="volt" />
      </div>

      {adding && (
        <form onSubmit={handleCreateNotice} className="panel p-6 bg-carbon border-2 border-volt rounded-xl space-y-4">
          <h3 className="text-xl font-bold text-chrome">Compose Chapter Announcement</h3>
          <div>
            <label className="block text-xs font-mono text-titanium mb-1">HEADLINE TITLE</label>
            <Input
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
              placeholder="e.g. Backstage Gate Change Notice"
              required
              style={{ minHeight: "44px" }}
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-titanium mb-1">NOTICE BODY</label>
            <Textarea
              value={newBody}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewBody(e.target.value)}
              placeholder="Detail the instructions or guidelines..."
              rows={4}
              required
            />
          </div>
          <Button type="submit" variant="primary" style={{ minHeight: "48px" }}>
            Publish to Chapter Feed
          </Button>
        </form>
      )}

      <div className="panel bg-carbon border border-subtle overflow-x-auto rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Title</th>
              <th className="p-4">Category</th>
              <th className="p-4">Author</th>
              <th className="p-4">Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {articles.map((a) => (
              <tr key={a.id} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 font-bold text-chrome">{a.title}</td>
                <td className="p-4 mono text-xs text-titanium">{a.category}</td>
                <td className="p-4 text-xs text-titanium">{a.author}</td>
                <td className="p-4 mono text-xs text-titanium">{a.date}</td>
                <td className="p-4">
                  <Status tone={a.tone}>{a.status}</Status>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => alert(`Editing notice ${a.id}`)}
                    className="button button-ghost text-xs"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
