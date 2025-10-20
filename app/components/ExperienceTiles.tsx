// components/ExperienceTiles.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import React from 'react';
import gsap from 'gsap';

export default function ExperienceTiles() {
  const [hoveredExperience, setHoveredExperience] = useState<number | null>(null);
  const textRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    // This GSAP animation creates the snappy text effect on hover
    textRefs.current.forEach((el, i) => {
      // Animate out any text that isn't the currently hovered one
      if (hoveredExperience !== i) {
        gsap.to(el, { opacity: 0, y: 10, duration: 0.2, ease: 'power2.in' });
      }
    });

    // Animate in the text for the currently hovered tile
    if (hoveredExperience !== null && textRefs.current[hoveredExperience]) {
      gsap.to(textRefs.current[hoveredExperience], { 
        opacity: 1, 
        y: 0, 
        delay: 0.4, // Delay starts after the resize has begun
        duration: 0.3, 
        ease: 'power2.out' 
      });
    }
  }, [hoveredExperience]);

  const experiences = [
    { 
      title: "Urban Oasis",
      location: "Colombo",
      description: "Immerse yourself in the vibrant heart of the city. Perfect for business travelers and cultural explorers seeking five-star luxury amidst urban energy.", 
      image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
      lit: "bg-gradient-to-l from-yellow-800/35 to-transparent"

    },
    { 
      title: "Highland Retreat", 
      location: "Kandy",
      description: "Escape to a serene sanctuary in the mist-covered hills. A perfect blend of nature, culture, and tranquility with breathtaking views.", 
      image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2070&auto-format&fit=crop",
      lit: "bg-gradient-to-l from-yellow-800/35 via-yellow-800/15 to-yellow-800/33"
    },
    { 
      title: "Coastal Chronicle", 
      location: "Galle",
      description: "Step back in time within a historic fort. Experience colonial charm, stunning ocean vistas, and the relaxing rhythm of coastal life.", 
      image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?q=80&w=1974&auto-format&fit=crop",
      lit: "bg-gradient-to-r from-yellow-800/33 to-transparent" 
    }
  ];

  return (
    <section className="py-20 px-6 bg-[#181d28]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-6xl font-l text-amber-400 font-semibold mb-4">Tailor Your Experience</h2>
          <p className="text-xl font-l text-gray-400 max-w-3xl mx-auto">Choose the destination that inspires your next journey.</p>
        </div>
        <div className="flex h-[600px] overflow-hidden" onMouseLeave={() => setHoveredExperience(null)}>
          {experiences.map((exp, index) => {
            const isHovered = hoveredExperience === index;
            const isAnyHovered = hoveredExperience !== null;

            return (
              <React.Fragment key={exp.title}>
                <div
                  onMouseEnter={() => setHoveredExperience(index)}
                  className={`relative p-8 overflow-hidden transition-all duration-700 ease-in-out cursor-pointer
                    ${isAnyHovered ? (isHovered ? 'w-3/5' : 'w-1/5') : 'w-1/3'}
                  `}
                >
                  <Image 
                    src={exp.image} 
                    fill 
                    alt={exp.title} 
                    className="absolute inset-0 z-0 object-cover transition-all duration-700 ease-in-out opacity-60 brightness-75" 
                    style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1.2)'}}
                  />
                  <div className={`absolute inset-0 backdrop-blur-lg mask-b-from-20% mask-b-to-100% bg-black/20 transition-all duration-500 ${isHovered ? exp.lit  : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent"></div>
                  </div>
                  <div className="relative w-full z-10 flex flex-col h-full text-white">
                    <h3 className="text-3xl text-center font-l text-amber-400 font-medium mt-2">{exp.title}</h3>
                    <h3 className="text-lg text-center font-l font-light mb-4">{exp.location}</h3>
                    <p ref={el => { textRefs.current[index] = el; }} className="text-center font-l font-extralight opacity-0">
                      {exp.description}
                    </p>
                  </div>
                </div>

                {index < experiences.length - 1 && (
                  <div className="relative w-[2px] h-full flex-shrink-0">
                    <div className="absolute inset-0 bg-gray-800"></div>
                    <div className={`absolute inset-0 bg-gradient-to-t from-amber-500/20 via-amber-500 to-amber-500/20 transition-opacity duration-500 shadow-[0_0_40px_5px_rgba(251,191,36,0.7)]
                      ${(hoveredExperience === index || hoveredExperience === index + 1) ? 'opacity-100' : 'opacity-0'}
                    `}></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

