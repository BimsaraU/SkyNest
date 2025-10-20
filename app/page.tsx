'use client'

import { Phone, Shield, Clock, Award } from 'lucide-react'
import Link from 'next/link'
import NavBar from './components/NavBar'
import BookingBar from './components/BookingBar'
import ExperienceTiles from './components/ExperienceTiles'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className={`overflow-clip min-h-screen bg-[#10141c] text-gray-300`}>
      <NavBar />

      <div className="pt-[81px] relative h-[700px] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-bottom"
          style={{ backgroundImage: "url('/M2.jpg')" }}
        />
        <div className="absolute inset-0 bg-[#10141c]/60"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/30 via-transparent to-transparent"></div>
        
        <div className="relative z-10 text-center text-white max-w-5xl px-6">
          <h5 className="text-5xl font-bold mb-[-20px] leading-tight">
            <span className="font-l font-light">Discover Paradise in</span>
          </h5>
          <h1 className="text-5xl md:text-9xl font-bold mb-5 leading-tight">
            <span className="font-s font-medium text-l block text-amber-400">Sri Lanka</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto font-l">
            Experience luxury and comfort at Sky Nest Hotels. <br></br>
            Your perfect getaway awaits.
          </p>
        </div>
      </div>
      
      <BookingBar />
      
      <section className="py-20 px-6 font-l font-medium">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-6xl font-bold mb-4 text-amber-500">Why Choose Sky Nest?</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">Experience world-class hospitality with modern amenities and personalized service.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: 'Best Price Guarantee', desc: "Find a lower price? We'll match it and give you an extra 10% off." },
              { icon: Clock, title: 'Flexible Cancellation', desc: 'Free cancellation up to 5 days before check-in.' },
              { icon: Phone, title: '24/7 Support', desc: 'Round-the-clock customer service to assist you anytime.' },
              { icon: Award, title: 'Award Winning', desc: 'Recognized for excellence in hospitality and guest satisfaction.' }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-amber-500 transition duration-300">
                  <item.icon className="w-10 h-10 text-amber-500 group-hover:text-[#10141c] transition duration-300" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ExperienceTiles />

      <footer className="bg-[#0c0f14] text-gray-400 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Image src="/SNC.png" alt="Sky Nest Logo" width={200} height={50} className="mb-4" />
              <p className="mb-4">Experience luxury and comfort across Sri Lanka's most beautiful destinations.</p>
              <div className="flex space-x-4 items-center">
                <Phone className="w-5 h-5 text-amber-400" />
                <span>+94 11 234 5678</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2"><Link href="#" className="hover:text-amber-400 transition">Book Now</Link></ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Our Locations</h4>
              <ul className="space-y-2"><li>Colombo</li><li>Kandy</li><li>Galle</li></ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Portals</h4>
              <ul className="space-y-2"><li><Link href="./auth/login" className="hover:text-amber-400 transition">Guest Login</Link></li>
                                        <li><Link href="./auth/admin-login" className="hover:text-amber-400 transition">Admin Login</Link></li>
                                        <li><Link href="./auth/staff-login" className="hover:text-amber-400 transition">Staff Login</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500">
            <p>&copy; 2025 Sky Nest Hotel & Resort. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

