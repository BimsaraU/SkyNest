// components/LoginButton.tsx
"use client";

import Link from 'next/link';

interface LoginButtonProps {
  isScrolled: boolean;
}

const LoginButton: React.FC<LoginButtonProps> = ({ isScrolled }) => {
  const linkStyles = {
    top: 'border-amber-400 text-amber-400 hover:border-amber-400 hover:bg-amber-400 hover:text-gray-800',
    scrolled: 'border-gray-300 text-gray-300 hover:border-amber-400 hover:text-amber-400'
  };

  return (
    <Link href="./auth/login">
      <button className={`px-5 py-1 rounded-full border transition-colors duration-300 text-sm ${isScrolled ? linkStyles.scrolled : linkStyles.top}`}>
        LOG IN
      </button>
    </Link>
  );
};

export default LoginButton;

