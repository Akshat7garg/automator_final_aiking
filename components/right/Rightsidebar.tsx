"use client";
import React, { useEffect, useState } from "react";
import "./scroll.css";
import { useThemeStore } from "@/app/store";

const SYSTEM_FONTS = ["Arial", "Cambria", "Garamond", "Times New Roman"];

const resumeTemplatesFree = [
  { name: "Bonzor", image: "/images/bonzor.png" },
  { name: "Luxary", image: "/images/luxary.png" },
  { name: "Unique", image: "/images/unique.png" },
  { name: "Classic", image: "/images/classic.png" },
];

const resumeTemplatesPremium = [
  { name: "Celibi", image: "/images/celibi.png" },
  { name: "Modern", image: "/images/modern.png" },
  { name: "Glalie", image: "/images/glalie.png" },
  { name: "Pikachu", image: "/images/pikachu.png" },
];

const fonts = [
  "Arial",
  "Cambria",
  "Garamond",
  "IBM Plex Sans",
  "IBM Plex Serif",
  "Lato",
  "Lora",
  "Merriweather",
  "Open Sans",
  "Playfair Display",
  "PT Sans",
  "PT Serif",
  "Roboto Condensed",
  "Times New Roman",
];

const themeColors = [
  "#1f2937",
  "#4b5563",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#9333ea",
  "#c026d3",
  "#db2777",
];

const RightSidebar: React.FC = () => {
  const {
    primaryColor,
    setPrimaryColor,
    backgroundColor,
    setBackgroundColor,
    selectedFont,
    setSelectedFont,
    fontWeight,
    setFontWeight,
    fontStyle,
    setFontStyle,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    hideIcons,
    setHideIcons,
    underlineLinks,
    setUnderlineLinks,
    selectedTemplate,
    setSelectedTemplate,
  } = useThemeStore();

  const [fontSubset, setFontSubset] = useState<string>("latin");
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free");
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  const sliderStyles = `
    w-full h-2 bg-gradient-to-r from-gray-700 to-gray-900 rounded-full appearance-none cursor-pointer
    [&::-webkit-slider-thumb]:appearance-none
    [&::-webkit-slider-thumb]:w-5
    [&::-webkit-slider-thumb]:h-5
    [&::-webkit-slider-thumb]:bg-gradient-to-br from-white to-${primaryColor}
    [&::-webkit-slider-thumb]:rounded-full
    [&::-webkit-slider-thumb]:shadow-lg
    [&::-webkit-slider-thumb]:transition-all
    [&::-webkit-slider-thumb]:duration-200
    [&::-webkit-slider-thumb]:hover:scale-125
    [&::-webkit-slider-thumb]:hover:shadow-glow
    [&::-webkit-slider-thumb]:active:scale-95

    [&::-moz-range-thumb]:appearance-none
    [&::-moz-range-thumb]:w-5
    [&::-moz-range-thumb]:h-5
    [&::-moz-range-thumb]:bg-gradient-to-br from-white to-${primaryColor}
    [&::-moz-range-thumb]:rounded-full
    [&::-moz-range-thumb]:shadow-lg
    [&::-moz-range-thumb]:transition-all
    [&::-moz-range-thumb]:duration-200
    [&::-moz-range-thumb]:hover:scale-125
    [&::-moz-range-thumb]:hover:shadow-glow
    [&::-moz-range-thumb]:active:scale-95

    [&::-ms-thumb]:appearance-none
    [&::-ms-thumb]:w-5
    [&::-ms-thumb]:h-5
    [&::-ms-thumb]:bg-gradient-to-br from-white to-${primaryColor}
    [&::-ms-thumb]:rounded-full
    [&::-ms-thumb]:shadow-lg
    [&::-ms-thumb]:transition-all
    [&::-ms-thumb]:duration-200
    [&::-ms-thumb]:hover:scale-125
    [&::-ms-thumb]:hover:shadow-glow
    [&::-ms-thumb]:active:scale-95
  `;

  // --- Check premium from localStorage.SubscriptionType
  useEffect(() => {
    if (typeof window === "undefined") return;
    const subscriptionType = localStorage.getItem("SubscriptionType");
    // Premium if SubscriptionType exists AND is not "FreeTrialStarted"
    setIsPremiumUser(Boolean(subscriptionType && subscriptionType === "FreeTrialStarted"));
  }, []);

  // --- Font loading (single optimized effect)
  useEffect(() => {
    // expose selected font to CSS
    document.documentElement.style.setProperty("--selected-font", selectedFont);

    if (SYSTEM_FONTS.includes(selectedFont)) return;

    const existingLinks = document.querySelectorAll("link[data-font]");
    existingLinks.forEach((link) => link.remove());

    const fontName = selectedFont.replace(/ /g, "+");
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName}:ital,wght@0,400;0,700;1,400;1,700&subset=${fontSubset}&display=swap`;

    const link = document.createElement("link");
    link.href = fontUrl;
    link.rel = "stylesheet";
    link.setAttribute("data-font", fontName);
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [selectedFont, fontSubset]);

  const handleUpgradeClick = () => {
    if (typeof window === "undefined") return;
    window.location.href =
      "/payment?plan=Premium&price=₹499¤cy=INR&for=candidate";
  };

  const baseTemplateCardClasses =
    "relative cursor-pointer p-2 rounded-xl transition-all duration-500 ease-in-out transform scale-95 hover:scale-100 hover:shadow-glow overflow-hidden";

  return (
    <div className="p-4 w-full max-w-full sm:max-w-full h-full bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] text-white border-l border-gray-700 shadow-2xl overflow-y-scroll scrollbar-thin">
      {/* Job Description */}
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-extrabold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent animate-pulse">
          Job Description
        </h2>
        <textarea
          placeholder="Enter job description here..."
          className={`w-full p-3 text-sm sm:text-base border border-gray-600 rounded-xl bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] backdrop-blur-md text-white h-20 sm:h-24 resize-none focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow focus:ring-2`}
        />
      </div>

      {/* Resume Templates */}
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-extrabold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Resume Templates
        </h2>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-3">
          <button
            className={`px-4 py-1 rounded-lg text-sm ${activeTab === "free"
              ? "bg-white text-black font-semibold"
              : "bg-gray-700 text-gray-300"
              }`}
            onClick={() => setActiveTab("free")}
          >
            Free
          </button>

          <button
            className={`px-4 py-1 rounded-lg text-sm ${activeTab === "premium"
              ? "bg-white text-black font-semibold"
              : "bg-gray-700 text-gray-300"
              }`}
            onClick={() => setActiveTab("premium")}
          >
            Premium
          </button>
        </div>

        {/* Slider container */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500"
            style={{
              transform:
                activeTab === "free" ? "translateX(0%)" : "translateX(-50%)",
              width: "200%",
            }}
          >
            {/* FREE TEMPLATES */}
            <div className="grid grid-cols-2 gap-4 w-1/2">
              {resumeTemplatesFree.map((template) => {
                const isSelected =
                  selectedTemplate === template.name.toLowerCase();
                return (
                  <div
                    key={template.name}
                    onClick={() =>
                      setSelectedTemplate(template.name.toLowerCase())
                    }
                    className={`${baseTemplateCardClasses} ${isSelected
                      ? `border-2 bg-gray-800/50 backdrop-blur-md shadow-xl`
                      : "border border-gray-700"
                      }`}
                  >
                    <img
                      src={template.image}
                      alt={`${template.name} preview`}
                      className="w-full h-full object-cover rounded-lg transition-transform duration-300"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg">
                      <p className="text-white text-sm sm:text-lg font-semibold drop-shadow-lg">
                        {template.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PREMIUM TEMPLATES */}
            <div className="grid grid-cols-2 gap-4 w-1/2">
              {resumeTemplatesPremium.map((template) => {
                const isSelected =
                  selectedTemplate === template.name.toLowerCase();
                const canUseTemplate = isPremiumUser;

                return (
                  <div
                    key={template.name}
                    onClick={() => {
                      if (!canUseTemplate) {
                        setShowPremiumPopup(true);
                      } else {
                        setSelectedTemplate(template.name.toLowerCase());
                      }
                    }}
                    className={`${baseTemplateCardClasses} ${canUseTemplate && isSelected
                      ? "border-2 border-yellow-400 bg-gray-800/50"
                      : "border border-gray-700"
                      }`}
                  >
                    <img
                      src={template.image}
                      alt={`${template.name} preview`}
                      className={`w-full h-full object-cover rounded-lg transition-transform duration-300 ${!canUseTemplate ? "opacity-40" : ""
                        }`}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg">
                      <p className="text-white text-sm sm:text-lg font-semibold drop-shadow-lg">
                        {template.name}
                      </p>
                    </div>

                    {!canUseTemplate && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
                        <p className="text-yellow-400 font-semibold">
                          Premium
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Premium Popup */}
        {showPremiumPopup && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#120020] text-white p-6 rounded-2xl w-80 shadow-xl">
              <h2 className="text-xl font-bold mb-3">Premium Only</h2>
              <p className="text-gray-300 mb-5">
                Upgrade to Premium to unlock all advanced resume templates.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 bg-gray-700 rounded-lg"
                  onClick={() => setShowPremiumPopup(false)}
                >
                  Close
                </button>

                <button
                  className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg"
                  onClick={handleUpgradeClick}
                >
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Typography */}
      <h2 className="text-lg sm:text-xl font-extrabold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
        Typography
      </h2>

      {/* Font Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {fonts.map((font) => (
          <button
            key={font}
            onClick={() => setSelectedFont(font)}
            className={`text-xs sm:text-sm p-2 border rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-glow w-full ${selectedFont === font
              ? "bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] backdrop-blur-md font-bold"
              : "bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E]"
              }`}
            style={{ fontFamily: font }}
          >
            {font}
          </button>
        ))}
      </div>

      {/* Font Family */}
      <div className="mt-4">
        <h3 className="text-base font-semibold mb-2 text-gray-200">
          Font Family
        </h3>
        <select
          value={selectedFont}
          onChange={(e) => setSelectedFont(e.target.value)}
          className="w-full p-2 text-sm sm:text-base border border-gray-600 rounded-xl bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] backdrop-blur-md text-gray-500 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
        >
          {fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* Font Subset */}
      <div className="mt-3">
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-200">
          Font Subset
        </h3>
        <select
          className="w-full p-2 text-sm sm:text-base border border-gray-600 rounded-xl bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] backdrop-blur-md text-gray-500 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
          value={fontSubset}
          onChange={(e) => setFontSubset(e.target.value)}
        >
          <option value="latin">Latin</option>
          <option value="cyrillic">Cyrillic</option>
          <option value="greek">Greek</option>
        </select>
      </div>

      {/* Font Variants */}
      <div className="mt-3">
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-200">
          Font Variants
        </h3>
        <select
          className="w-full p-2 text-sm sm:text-base border border-gray-600 rounded-xl bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] backdrop-blur-md text-gray-500 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
          value={
            fontStyle === "italic"
              ? "italic"
              : fontWeight === "700"
                ? "bold"
                : "regular"
          }
          onChange={(e) => {
            const value = e.target.value;
            if (value === "italic") {
              setFontStyle("italic");
              setFontWeight("400");
            } else if (value === "bold") {
              setFontStyle("normal");
              setFontWeight("700");
            } else {
              setFontStyle("normal");
              setFontWeight("400");
            }
          }}
        >
          <option value="regular">Regular</option>
          <option value="bold">Bold</option>
          <option value="italic">Italic</option>
        </select>
      </div>

      {/* Font Size */}
      <div className="mt-4">
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-200">
          Font Size
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="18"
            max="36"
            step="0.1"
            value={fontSize}
            onChange={(e) => setFontSize(parseFloat(e.target.value))}
            className={sliderStyles}
          />
          <span className="min-w-[3ch] text-gray-300 font-mono text-sm">
            {fontSize}
          </span>
        </div>
      </div>

      {/* Line Height */}
      <div className="mt-3">
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-200">
          Line Height
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="1"
            max="2"
            step="0.1"
            value={lineHeight}
            onChange={(e) => setLineHeight(parseFloat(e.target.value))}
            className={sliderStyles}
          />
          <span className="min-w-[3ch] text-gray-300 font-mono text-sm">
            {lineHeight}
          </span>
        </div>
      </div>

      {/* Options */}
      <div className="mt-4">
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-200">
          Options
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300 text-sm">Hide Icons</span>
            <div
              className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ease-in-out ${hideIcons ? "bg-gradient-to-r from-blue-600" : "bg-gray-700"
                }`}
              onClick={() => setHideIcons(!hideIcons)}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-300 ease-in-out shadow-md ${hideIcons
                  ? "bg-gray-300 transform translate-x-7"
                  : "bg-gray-400"
                  }`}
              />
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300 text-sm">Underline Links</span>
            <div
              className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ease-in-out ${underlineLinks
                ? "bg-gradient-to-r from-blue-600"
                : "bg-gray-700"
                }`}
              onClick={() => setUnderlineLinks(!underlineLinks)}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-300 ease-in-out shadow-md ${underlineLinks
                  ? "bg-white transform translate-x-7"
                  : "bg-gray-400"
                  }`}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Theme */}
      <div className="mt-6">
        <h2 className="text-xl sm:text-2xl font-extrabold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Theme
        </h2>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {themeColors.map((color) => (
            <button
              key={color}
              onClick={() => setPrimaryColor(color)}
              className={`w-8 h-8 rounded-full transition-all duration-300 transform hover:scale-125 hover:shadow-glow ${primaryColor === color
                ? "ring-2 ring-white ring-offset-2 ring-offset-black shadow-xl"
                : ""
                }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Color Inputs */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-200">
              Primary Color
            </h3>
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-full p-2 text-sm sm:text-base border border-gray-600 rounded-xl bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] backdrop-blur-md text-white focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
            />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 text-gray-200">
              Background Color
            </h3>
            <input
              type="text"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-600 rounded-xl bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] backdrop-blur-md text-white focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow text-sm sm:text-base"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
