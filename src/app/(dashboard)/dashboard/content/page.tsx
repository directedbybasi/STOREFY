"use client";

import React, { useState } from "react";
import {
  FileText,
  BookOpen,
  Plus,
  Globe,
  CheckCircle2,
  Clock,
  Eye,
  Edit,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContentCmsPage() {
  const [activeTab, setActiveTab] = useState<"pages" | "blog">("pages");

  const [pages] = useState([
    {
      id: "p1",
      title: "About Our Craft",
      slug: "about-our-craft",
      status: "PUBLISHED",
      updatedAt: "2 days ago",
      author: "Admin Staff",
      views: 1240,
    },
    {
      id: "p2",
      title: "Sustainability & Ethical Sourcing",
      slug: "sustainability",
      status: "PUBLISHED",
      updatedAt: "1 week ago",
      author: "Admin Staff",
      views: 890,
    },
    {
      id: "p3",
      title: "Wholesale & Custom Inquiries",
      slug: "wholesale-inquiry",
      status: "DRAFT",
      updatedAt: "Yesterday",
      author: "Sales Team",
      views: 0,
    },
  ]);

  const [posts] = useState([
    {
      id: "b1",
      title: "The Art of Kashmiri Pashmina Weaving",
      slug: "art-of-pashmina-weaving",
      category: "Artisan Stories",
      status: "PUBLISHED",
      publishedAt: "Sept 08, 2026",
      tags: ["Heritage", "Weaving", "Silk"],
      author: "Master Weaver Farooq",
    },
    {
      id: "b2",
      title: "Top 5 Festive Styling Ideas for Handcrafted Kurtas",
      slug: "festive-styling-ideas",
      category: "Style Guide",
      status: "PUBLISHED",
      publishedAt: "Sept 01, 2026",
      tags: ["Festive", "Kurtas", "Fashion"],
      author: "Priya Sharma",
    },
    {
      id: "b3",
      title: "Behind the Scenes: Sourcing Sustainable Organic Cotton",
      slug: "behind-the-scenes-cotton",
      category: "Sustainability",
      status: "DRAFT",
      publishedAt: null,
      tags: ["Eco-friendly", "Cotton"],
      author: "Aarav Studio Team",
    },
  ]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Content Management (CMS & Blog)</h1>
            <span className="text-xs bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-full">
              Phase 16 CMS
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Author SEO-optimized storefront pages and editorial blog articles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> {activeTab === "pages" ? "Create Page" : "Write Blog Post"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("pages")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "pages"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-4 h-4" /> Pages ({pages.length})
        </button>
        <button
          onClick={() => setActiveTab("blog")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "blog"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="w-4 h-4" /> Blog Articles ({posts.length})
        </button>
      </div>

      {/* Pages Tab */}
      {activeTab === "pages" && (
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Storefront Custom Pages</h3>
          </div>
          <div className="divide-y text-sm">
            {pages.map((p) => (
              <div key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{p.title}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      /pages/{p.slug}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Author: {p.author} • Updated {p.updatedAt}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      p.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {p.status === "PUBLISHED" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {p.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1.5" /> Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blog Tab */}
      {activeTab === "blog" && (
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Editorial Articles & Stories</h3>
          </div>
          <div className="divide-y text-sm">
            {posts.map((b) => (
              <div key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{b.title}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
                      {b.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      /blog/{b.slug}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">By {b.author}</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {b.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-secondary px-2 py-0.5 rounded text-secondary-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      b.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {b.status === "PUBLISHED" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {b.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1.5" /> Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
