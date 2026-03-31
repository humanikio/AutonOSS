'use client'

import React from 'react'
import { Menu, X } from 'lucide-react'

interface MobileHeaderProps {
  isMenuOpen: boolean
  toggleMenu: () => void
}

export default function MobileHeader({ isMenuOpen, toggleMenu }: MobileHeaderProps) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
      <div className="flex items-center">
        <img
          src="/logo/auton-logo.png"
          alt="Auton"
          className="h-8 w-8 object-contain"
        />
        <span className="ml-3 text-xl font-bold gradient-text">
          Auton
        </span>
      </div>
      
      <button
        onClick={toggleMenu}
        className="p-2 rounded-md hover:bg-gray-100 transition-colors"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
      >
        {isMenuOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>
    </div>
  )
}