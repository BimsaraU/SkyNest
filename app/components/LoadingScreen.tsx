"use client";

import Image from 'next/image';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#10141c] flex items-center justify-center z-[100]">
      <div className="animate-pulse">
        <Image src="/SNC.png" alt="Loading Sky Nest" width={300} height={60} />
      </div>
    </div>
  );
}
