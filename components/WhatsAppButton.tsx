"use client";

import React from "react";
import { FaWhatsapp } from "react-icons/fa";

const WhatsAppButton: React.FC = () => {
    const phoneNumber = "919766116839";
    const message =
        "Hello, I’d like to get in touch regarding your services. Here’s what I’d like to know…";

    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
        message
    )}`;

    return (
        <a
            href={whatsappURL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="fixed bottom-5 right-5 lg:bottom-10 lg:right-10 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 text-white hover:shadow-[0_5px_11px_#ffffff] hover:bg-green-600 transition-all duration-300"
        >
            <FaWhatsapp size={28} />
        </a>
    );
};

export default WhatsAppButton;
