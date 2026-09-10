import Link from "next/link";

interface AnnouncementBarProps {
  text?: string;
  link?: string;
}

export function StorefrontAnnouncementBar({ text, link }: AnnouncementBarProps) {
  if (!text || text.trim() === "") return null;

  const content = (
    <div className="w-full bg-[var(--store-primary,#0f172a)] text-white text-xs sm:text-sm py-2 px-4 text-center font-medium tracking-wide transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span>{text}</span>
        {link && <span className="underline text-xs opacity-90 hover:opacity-100">Learn more &rarr;</span>}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
