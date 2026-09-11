"use client";

import React, { useState } from "react";
import {
  FileText,
  BookOpen,
  Plus,
  Eye,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="space-y-6">
      <PageHeader
        title="Content Management"
        description="Publish storefront pages, policy documentation, and editorial blog articles."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Content" },
        ]}
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {activeTab === "pages" ? "Create Page" : "Write Article"}
          </Button>
        }
      />

      {/* Segment Navigation */}
      <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border">
        <button
          type="button"
          onClick={() => setActiveTab("pages")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "pages"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Pages ({pages.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("blog")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "blog"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Blog Articles ({posts.length})</span>
        </button>
      </div>

      {/* Pages Tab */}
      {activeTab === "pages" && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title & Route</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium text-foreground text-xs">{p.title}</div>
                    <span className="font-mono text-[10px] text-muted-foreground">/pages/{p.slug}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.author}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.updatedAt}
                  </TableCell>
                  <TableCell className="font-tabular text-xs text-foreground">
                    {p.views.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "PUBLISHED" ? "success" : "neutral"} dot>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="xs">
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Blog Tab */}
      {activeTab === "blog" && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium text-foreground text-xs">{b.title}</div>
                    <span className="font-mono text-[10px] text-muted-foreground">/blog/{b.slug}</span>
                    <div className="flex gap-1 mt-1">
                      {b.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {b.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.author}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-tabular">
                    {b.publishedAt || "Draft"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.status === "PUBLISHED" ? "success" : "neutral"} dot>
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="xs">
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
