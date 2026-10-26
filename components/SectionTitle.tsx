import Link from "next/link";

interface SectionTitleProps {
  title: string;
  viewAllLink?: string;
}

export default function SectionTitle({ title, viewAllLink }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-white font-outfit drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{title}</h2>
      {viewAllLink && (
        <Link
          href={viewAllLink}
          className="text-sm font-medium text-[var(--color-cyan-neon)] hover:text-white hover:drop-shadow-[0_0_8px_var(--color-cyan-neon)] transition-all"
        >
          Xem thêm
        </Link>
      )}
    </div>
  );
}
