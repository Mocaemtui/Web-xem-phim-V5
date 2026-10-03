import Link from "next/link";
import SectionTitle from "@/components/SectionTitle";
import { getQuocGia } from "@/lib/api";

export default async function QuocGiaPage() {
  let quocGiaData: any = null;
  try {
    quocGiaData = await getQuocGia();
  } catch (e) {
    console.error("Lỗi lấy danh sách quốc gia:", e);
  }
  const items = Array.isArray(quocGiaData?.data?.items) ? quocGiaData.data.items : [];
  return (
    <div className="container mx-auto px-4 py-8">
      <SectionTitle title="Quốc gia" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((country: any) => (
          <Link
            key={country.id}
            href={`/quoc-gia/${country.slug}`}
            className="p-4 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors text-center"
          >
            <span className="text-white font-medium">{country.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
