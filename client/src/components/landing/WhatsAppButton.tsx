import { motion } from "framer-motion";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { GENERAL_MESSAGE, whatsappUrl } from "@/data/contact";

const WhatsAppButton = () => {
  const handleClick = () => {
    window.open(whatsappUrl(GENERAL_MESSAGE), "_blank", "noopener");
  };

  return (
    <motion.button
      onClick={handleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2 }}
      className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex items-center gap-3 text-white pl-4 pr-5 py-3 shadow-2xl hover:opacity-90 transition-opacity duration-200"
      style={{ backgroundColor: "#25D366" }}
      aria-label="Chat on WhatsApp"
    >
      <WhatsAppIcon className="flex-shrink-0" />
      <span className="text-[11px] tracking-[0.18em] uppercase font-medium">
        Chat Now
      </span>
    </motion.button>
  );
};

export default WhatsAppButton;
