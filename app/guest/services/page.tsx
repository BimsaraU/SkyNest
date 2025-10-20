// app/guest/services/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Utensils, Flower, Plane, Dumbbell, Briefcase, Plus } from 'lucide-react'

// Mock Data
const categories = [
    { id: 'all', name: 'All Services', icon: Plus },
    { id: 'dining', name: 'Dining', icon: Utensils },
    { id: 'spa', name: 'Spa & Wellness', icon: Flower },
    { id: 'recreation', name: 'Recreation', icon: Dumbbell },
    { id: 'transport', name: 'Transport', icon: Plane },
    { id: 'business', name: 'Business', icon: Briefcase },
];

const services = [
    { id: 1, name: 'Room Service', category: 'dining', description: '24/7 in-room dining with extensive menu options.', price: 'From $15', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400', popular: true },
    { id: 2, name: 'Spa Treatment', category: 'spa', description: 'Relaxing massages, facials, and wellness treatments.', price: 'From $80', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400', popular: true },
    { id: 3, name: 'Airport Transfer', category: 'transport', description: 'Comfortable airport pickup and drop-off service.', price: '$50 per trip', image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400', popular: true },
    { id: 5, name: 'Fitness Center', category: 'recreation', description: 'Fully-equipped gym with modern fitness equipment.', price: 'Complimentary', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400' },
    { id: 6, name: 'Fine Dining', category: 'dining', description: 'Gourmet cuisine with local and international specialties.', price: 'From $40', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400' },
];

const filteredServices = (category: string) => category === 'all' ? services : services.filter(s => s.category === category);

export default function GuestServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
      <GuestNavbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 font-l">Hotel Services & Amenities</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Enhance your stay with our premium services. From dining to wellness, we're here to make your experience unforgettable.</p>
        </header>

        <Card className="shadow-lg bg-white/60 backdrop-blur-xl border-white/20 rounded-xl mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map(category => (
                <Button 
                  key={category.id} 
                  onClick={() => setSelectedCategory(category.id)}
                  variant={selectedCategory === category.id ? 'default' : 'secondary'}
                >
                  <category.icon size={16} className="mr-2"/>
                  {category.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices(selectedCategory).map(service => (
            <Card key={service.id} className="shadow-lg bg-white/60 backdrop-blur-xl border-white/20 rounded-2xl overflow-hidden group">
              <div className="relative overflow-hidden h-48">
                <Image src={service.image} alt={service.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500"/>
                {service.popular && <div className="absolute top-3 right-3 bg-amber-400 text-black px-2 py-1 rounded-full text-xs font-bold">⭐ Popular</div>}
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-gray-600 mb-4 text-sm h-10">{service.description}</p>
                <div className="border-t pt-4 flex items-end justify-between">
                    <div>
                        <p className="text-sm text-gray-600">Price</p>
                        <p className="font-bold text-gray-900">{service.price}</p>
                    </div>
                    <Link href={`/guest/services/request?serviceId=${service.id}`} passHref>
                        <Button>Request Service</Button>
                    </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
