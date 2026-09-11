import type { Metadata } from "next";
import Link from "next/link";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { listBlogPosts } from "@/modules/cms/cms-service";
import { BookOpen, Calendar, ArrowRight } from "lucide-react";

interface StorefrontBlogPageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({
  params,
}: StorefrontBlogPageProps): Promise<Metadata> {
  const { domain } = await params;
  return {
    title: `Stories & Editorial Journal | ${domain}`,
    description: "Read the latest stories, craft journals, and updates.",
  };
}

export default async function StorefrontBlogPage({
  params,
}: StorefrontBlogPageProps) {
  const { domain } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    return null;
  }

  const { store } = resolution;
  const posts = await listBlogPosts(store.id, true);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-xs font-semibold tracking-wider text-primary uppercase">
          Journal & Stories
        </span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mt-2">
          {store.name} Editorial
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Discover our craft heritage, behind-the-scenes artisan journeys, and curated style guides.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-card">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg">No Stories Published Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Check back soon for new artisan journals and announcements.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group border rounded-2xl overflow-hidden bg-card hover:border-primary transition shadow-sm flex flex-col justify-between"
            >
              <div className="p-6">
                {post.category && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {post.category}
                  </span>
                )}
                <h3 className="text-lg font-bold mt-3 group-hover:text-primary transition line-clamp-2">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
              </div>
              <div className="px-6 pb-6 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString()
                    : "Recently"}
                </span>
                <span className="font-medium text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Read <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
