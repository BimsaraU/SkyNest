// components/AnimatedButton.tsx
import Link from 'next/link';
import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';

interface AnimatedButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ href, children, className }) => {
  const gradientRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);

  useLayoutEffect(() => {
    // 1. Create a GSAP tween to animate the --gradient-angle CSS variable
    animationRef.current = gsap.to(
      gradientRef.current, {
        '--gradient-angle': '450deg', // Animate from 90deg to 450deg (a full 360 sweep)
        duration: 1.5,
        ease: 'power1.inOut',
        paused: true,
      }
    );

    return () => {
      animationRef.current?.kill();
    };
  }, []);

  const handleMouseEnter = () => {
    animationRef.current?.play();
  };

  const handleMouseLeave = () => {
    animationRef.current?.reverse();
  };

  return (
    <Link 
      href={href}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-200 rounded-lg group ${className}`}
    >
      <span
        ref={gradientRef}
        // 2. Set the initial angle using an inline style
        style={{ '--gradient-angle': '90deg' } as React.CSSProperties}
        className="absolute inset-0 rounded-lg 
                   // 3. Use an angled linear-gradient with our CSS variable
                   bg-[linear-gradient(var(--gradient-angle),_#f59e0b,_#b45309,_#10141c)]
                   opacity-75 group-hover:opacity-100 transition-opacity duration-500"
                   // 4. REMOVED scale-150 as we are no longer rotating the element
      ></span>
      
      <span className="text-amber-400 relative px-6 py-2 transition-all ease-in duration-200 bg-[#10141c] rounded-md group-hover:bg-opacity-100">
        {children}
      </span>
    </Link>
  );
};

export default AnimatedButton;