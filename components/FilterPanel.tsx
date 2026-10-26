"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal, ChevronUp, Filter } from "lucide-react";
import type { Genre, Country } from "@/types/api";

const NAM_PHAT_HANH = Array.from({ length: 30 }, (_, i) => 2024 - i);

const LOAI_PHIM_LIST = [
  { name: "Phim lẻ", slug: "phim-le" },
  { name: "Phim bộ", slug: "phim-bo" },
  { name: "TV Shows", slug: "tv-shows" },
  { name: "Hoạt Hình", slug: "hoat-hinh" }
];

const PHIEN_BAN_LIST = [
  { name: "Phụ đề", slug: "phim-vietsub" },
  { name: "Thuyết minh", slug: "phim-thuyet-minh" },
  { name: "Lồng tiếng", slug: "phim-long-tieng" }
];

const SAP_XEP_LIST = [
  { name: "Mới cập nhật", slug: "modified.time" },
  { name: "Thời gian đăng", slug: "_id" },
  { name: "Năm sản xuất", slug: "year" }
];

interface FilterPanelProps {
  theLoaiList: Genre[];
  quocGiaList: Country[];
  initialFilters?: {
    theLoaiSlug?: string;
    quocGiaSlug?: string;
    year?: string;
    loaiPhim?: string;
    phienBan?: string;
    sortField?: string;
  };
  onFilterChange: (filters: {
    theLoai?: string;
    quocGia?: string;
    year?: string;
    loaiPhim?: string;
    phienBan?: string;
    sortField?: string;
  }) => void;
}

export default function FilterPanel({ theLoaiList, quocGiaList, initialFilters, onFilterChange }: FilterPanelProps) {
  const [selectedFilters, setSelectedFilters] = useState<{
    theLoaiSlug?: string;
    quocGiaSlug?: string;
    year?: string;
    loaiPhim?: string;
    phienBan?: string;
    sortField?: string;
  }>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);

  useEffect(() => {
    if (initialFilters) {
      setSelectedFilters(initialFilters);
    }
  }, [
    initialFilters?.theLoaiSlug,
    initialFilters?.quocGiaSlug,
    initialFilters?.year,
    initialFilters?.loaiPhim,
    initialFilters?.phienBan,
    initialFilters?.sortField
  ]);

  const handleFilterSelect = (
    type: keyof typeof selectedFilters,
    value: string
  ) => {
    const newVal = selectedFilters[type] === value ? undefined : value;
    const newFilters = {
      ...selectedFilters,
      [type]: newVal,
    };
    setSelectedFilters(newFilters);
    
    onFilterChange({
      theLoai: newFilters.theLoaiSlug,
      quocGia: newFilters.quocGiaSlug,
      year: newFilters.year,
      loaiPhim: newFilters.loaiPhim,
      phienBan: newFilters.phienBan,
      sortField: newFilters.sortField,
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(selectedFilters).some(
    (value) => value !== undefined
  );

  const activeCount = Object.values(selectedFilters).filter(
    (v) => v !== undefined
  ).length;

  const renderFilterGroup = (
    title: string,
    type: keyof typeof selectedFilters,
    items: { name: string; slug: string }[]
  ) => {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm sm:text-base">{title}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
          {items.map((item) => (
            <button
              key={item.slug}
              onClick={() => handleFilterSelect(type, item.slug)}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-1 text-xs sm:text-sm rounded-md transition-all ${
                selectedFilters[type] === item.slug
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 border-b dark:border-gray-700 pb-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500 text-white text-sm font-medium transition-colors active:bg-blue-600"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <SlidersHorizontal className="w-4 h-4" />
            )}
            <span>{isMobileOpen ? "Ẩn bộ lọc" : "Bộ lọc"}</span>
            {activeCount > 0 && (
              <span className="ml-1 bg-white text-blue-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
          <button
            className="hidden lg:flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white cursor-pointer hover:text-blue-500 transition-colors"
            onClick={() => setIsDesktopOpen(!isDesktopOpen)}
          >
            <Filter className="w-5 h-5 text-blue-500" /> Bộ Lọc Phim
            {isDesktopOpen ? <ChevronUp className="w-5 h-5 ml-1 text-gray-500" /> : <SlidersHorizontal className="w-5 h-5 ml-1 text-gray-500" />}
          </button>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-500 hover:text-red-700 transition-colors whitespace-nowrap font-medium"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Filter sections */}
      <div
        className={`space-y-5 overflow-y-auto max-h-[70vh] lg:max-h-none lg:overflow-visible ${
          isMobileOpen ? "block" : "hidden"
        } ${isDesktopOpen ? "lg:block" : "lg:hidden"}`}
      >
        {renderFilterGroup("Quốc gia", "quocGiaSlug", quocGiaList)}
        {renderFilterGroup("Loại phim", "loaiPhim", LOAI_PHIM_LIST)}
        {renderFilterGroup("Thể loại", "theLoaiSlug", theLoaiList)}
        {renderFilterGroup("Phiên bản", "phienBan", PHIEN_BAN_LIST)}
        {renderFilterGroup("Sắp xếp", "sortField", SAP_XEP_LIST)}

      </div>
    </div>
  );
}
