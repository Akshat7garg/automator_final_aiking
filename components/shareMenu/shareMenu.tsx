import { useState, useRef, useEffect } from "react";
import {
  WhatsappShareButton,
  WhatsappIcon,
  LinkedinShareButton,
  LinkedinIcon,
  TelegramShareButton,
  TelegramIcon,
  FacebookMessengerShareButton,
  FacebookMessengerIcon,
  TwitterShareButton,
  TwitterIcon,
} from "react-share";

const ShareMenu = ({ name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState("below");
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const dropdownHeight = 150; // Approximate height of dropdown in pixels

  useEffect(() => {
    const handleResize = () => {
      if (isOpen && buttonRef.current && dropdownRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const footer = document.querySelector("footer");
        const footerTop = footer ? footer.getBoundingClientRect().top : Infinity;

        // Check if dropdown would be cut off by footer
        if (spaceBelow < dropdownHeight && rect.bottom + dropdownHeight > footerTop) {
          setPosition("above");
        } else if (spaceAbove < dropdownHeight) {
          setPosition("below");
        } else {
          setPosition(spaceBelow < dropdownHeight ? "above" : "below");
        }
      }
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  const shareUrl = `/${name}`;
  const title = "🚀 Boost your career with AIKING! Get access to jobs, resume tools, and more.";

  return (
    <div className="relative inline-block text-left z-[1000]">
      {/* Share Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#0FAE96] text-[#11011E] px-6 py-2 rounded-md hover:bg-[#0FAE96]/80 transition"
      >
        🔗 Share
      </button>

      {/* Dropdown Social Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute right-0 z-1000 p-4 bg-[#11011E] border rounded-xl shadow-lg flex items-center space-x-4 ${
            position === "below" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
          style={{ zIndex: 1000, right: "0" }} // Explicitly align to right edge
        >
          <WhatsappShareButton url={shareUrl} title={title}>
            <WhatsappIcon size={40} round />
          </WhatsappShareButton>
          <LinkedinShareButton url={shareUrl} title={title}>
            <LinkedinIcon size={40} round />
          </LinkedinShareButton>
          <TelegramShareButton url={shareUrl} title={title}>
            <TelegramIcon size={40} round />
          </TelegramShareButton>
          <FacebookMessengerShareButton url={shareUrl} appId="YOUR_MESSENGER_APP_ID">
            <FacebookMessengerIcon size={40} round />
          </FacebookMessengerShareButton>
          <TwitterShareButton url={shareUrl} title={title}>
            <TwitterIcon size={40} round />
          </TwitterShareButton>
        </div>
      )}
    </div>
  );
};

export default ShareMenu;