"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { FaInstagram, FaFacebook, FaYoutube, FaLinkedin } from "react-icons/fa";

const Footer = () => {
  const footerRef = useRef(null);
  const [isInView, setIsInView] = useState(false);

  const socialLinks = [
    { name: "instagram", color: "hover:text-pink-500", link: "https://www.instagram.com/jobform.automator_offical" },
    { name: "facebook", color: "hover:text-blue-600", link: "https://www.facebook.com/people/Job-Tips/61556365446390/" },
    { name: "linkedin", color: "hover:text-blue-400", link: "https://www.linkedin.com/company/aikingsolutions/posts/?feedView=all" },
    { name: "youtube", color: "hover:text-red-500", link: "https://www.youtube.com/@JobFormAutomator" },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.2 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      className={`text-gray-300 py-12 sm:py-16 transition-all duration-700 ease-in-out 
      bg-gradient-to-b from-[#11011E] to-[#1A0435] 
      ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Name and Social Links */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col items-center space-y-6">
            {/* ✅ App Name for OAuth verification */}
            <h2 className="text-2xl font-semibold text-white tracking-wide text-center">
              Jobform Automator
            </h2>

            {/* Social Icons */}
            <div className="flex flex-wrap gap-5">
              {socialLinks.map(({ name, color, link }) => (
                <a
                  key={name}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow us on ${name}`}
                  className={`text-gray-400 transform hover:scale-110 
                    transition-all duration-300 ease-out hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] ${color}`}
                >
                  {name === "instagram" && <FaInstagram size={22} />}
                  {name === "facebook" && <FaFacebook size={22} />}
                  {name === "linkedin" && <FaLinkedin size={22} />}
                  {name === "youtube" && <FaYoutube size={22} />}
                </a>
              ))}
            </div>

            {/* Contact Info */}
            <p className="mt-4 text-sm text-gray-400 font-light text-center">
              +91 9766116839
              <br />
              contact@jobformautomator.com
            </p>
          </div>

          {/* Navigation Sections */}
          {["Quick Links", "Features", "Help"].map((section) => (
            <div
              key={section}
              className="flex flex-col space-y-4 items-start"
            >
              <h3 className="text-lg font-bold text-white pl-4">
                {section}
              </h3>
              <ul className="space-y-3 w-full max-w-[200px] pl-4">
                {section === "Quick Links" &&
                  [
                    { name: "Home", path: "/" },
                    { name: "Privacy Policy", path: "/policy" },
                    { name: "About", path: "/about" },
                  ].map((item) => (
                    <FooterLink key={item.name} href={item.path} text={item.name} />
                  ))}

                {section === "Features" &&
                  [
                    { name: "ATSCheck", path: "/atsresume" },
                    { name: "QuickResume", path: "/atsresume" },
                    { name: "Skills", path: "/course/jobdescription" },
                  ].map((item) => (
                    <FooterLink key={item.name} href={item.path} text={item.name} />
                  ))}

                {section === "Help" &&
                  [
                    { name: "Contact Us", path: "/contactUs" },
                    { name: "Settings", path: "/settings" },
                  ].map((item) => (
                    <FooterLink key={item.name} href={item.path} text={item.name} />
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

const FooterLink = ({ href, text }) => (
  <li>
    <Link
      href={href}
      className="text-gray-400 hover:text-white hover:underline underline-offset-4 hover:scale-110 transition transform duration-300 ease-in-out"
    >
      {text}
    </Link>
  </li>
);

export default Footer;
