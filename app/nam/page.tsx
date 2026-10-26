import Link from "next/link";
import SectionTitle from "@/components/SectionTitle";
import { getNamPhatHanh } from "@/lib/api";

export default async function NamPage() {
  const namData = await getNamPhatHanh();

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionTitle title="Năm phát hành" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {namData?.data?.items?.map((item) => (
          <Link
            key={item.year}
            href={`/nam/${item.year}`}
            className="p-4 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors text-center"
          >
            <span className="text-white font-medium">{item.year}</span>
          </Link>
        )) || []}
      </div>
    </div>
  );
}
