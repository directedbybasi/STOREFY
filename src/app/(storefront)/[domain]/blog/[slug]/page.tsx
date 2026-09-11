import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { getBlogPostBySlug } from "@/modules/cms/cms-service";
import { ArrowLeft, Calendar, User } from "lucide-react";

interface BlogPostPageProps {
  params: Promise<{ domain: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { domain, slug } = await params;
  const resolution = await resolveStorefrontTenant(domain);
  if (resolution.status !== "ACTIVE") return {};

  const post = await getBlogPostBySlug(resolution.store.id, slug, "en", true);
  if (!post) return {};

  return {
    title: `${post.seoTitle || post.title} | ${resolution.store.name}`,
    description: post.seoDescription || post.excerpt || undefined,
  };
}

export default async function StorefrontBlogPostPage({
  params,
}: BlogPostPageProps) {
  const { domain, slug } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    return null;
  }

  const { store } = resolution;
  const post = await getBlogPostBySlug(store.id, slug, "en", true);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-8 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Journal
      </Link>

      <header className="space-y-4 mb-8">
        {post.category && (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
            {post.category}
          </span>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          {post.title}
        </h1>
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-b pb-6">
          {post.author && (
            <span className="flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5" /> {post.author}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recently Published"}
          </span>
        </div>
      </header>

      {/* Editorial Content */}
      <div
        className="prose dark:prose-invert max-w-none text-base leading-relaxed space-y-4"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
