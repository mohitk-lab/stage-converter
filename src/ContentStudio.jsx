import { useState, useRef } from "react";

/* ========================================
   STAGE CONTENT STUDIO
   6 AI-powered modules for Stage OTT
======================================== */

const MODULES = [
  { id: "promo", icon: "\uD83C\uDFAC", label: "Promo Writer" },
  { id: "campaign", icon: "\uD83D\uDCE2", label: "Campaign" },
  { id: "translate", icon: "\uD83C\uDF10", label: "Translation" },
  { id: "script", icon: "\uD83D\uDCDC", label: "Script Gen" },
  { id: "thumbnail", icon: "\uD83D\uDDBC\uFE0F", label: "Thumbnail" },
  { id: "caption", icon: "\uD83D\uDCAC", label: "Captions" },
];

const LANGUAGES = [
  { value: "hindi", label: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { value: "bhojpuri", label: "\u092D\u094B\u091C\u092A\u0941\u0930\u0940" },
  { value: "haryanvi", label: "\u0939\u0930\u093F\u092F\u093E\u0923\u0935\u0940" },
  { value: "rajasthani", label: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928\u0940" },
  { value: "gujarati", label: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0" },
  { value: "marathi", label: "\u092E\u0930\u093E\u0920\u0940" },
];

const GENRES = [
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "thriller", label: "Thriller" },
  { value: "romance", label: "Romance" },
  { value: "action", label: "Action" },
  { value: "horror", label: "Horror" },
  { value: "social", label: "Social" },
  { value: "devotional", label: "Devotional" },
];

/* --- Language-specific templates for context --- */
const LANG_TEMPLATES = {
  bhojpuri: {
    hooks: {
      comedy: ["\u0908 \u092B\u093F\u0932\u094D\u092E \u0926\u0947\u0916\u0932\u093E \u0915\u0947 \u092C\u093E\u0926 \u092A\u0947\u091F \u0926\u0930\u094D\u0926 \u0915\u0947 \u0926\u0935\u093E\u0908 \u0932\u0947\u0935\u0947 \u0915\u0947 \u092A\u0921\u093C\u0940", "\u0939\u0902\u0938\u0940 \u0930\u094B\u0915\u0947 \u0915\u0947 \u0915\u094B\u0936\u093F\u0936 \u092E\u0924 \u0915\u0930\u0940\u0902", "\u0921\u0949\u0915\u094D\u091F\u0930 \u092D\u0940 \u092E\u0928\u093E \u0915\u0930 \u0930\u0939\u0932 \u092C\u093E\u0921\u093C\u0928"],
      drama: ["\u0906\u0902\u0916 \u092E\u0947\u0902 \u0906\u0902\u0938\u0942 \u0906 \u091C\u093E\u0908", "\u0926\u093F\u0932 \u0915\u0947 \u091B\u0942 \u0932\u0947\u0935\u0947 \u0935\u093E\u0932\u093E \u0915\u0939\u093E\u0928\u0940", "\u0938\u092E\u093E\u091C \u0915\u0947 \u0906\u0908\u0928\u093E \u0926\u0947\u0916\u093E\u0935\u0947 \u0935\u093E\u0932\u093E"],
      default: ["\u0908 \u092B\u093F\u0932\u094D\u092E \u091C\u0930\u0942\u0930 \u0926\u0947\u0916\u0940\u0902", "\u0938\u094D\u091F\u0947\u091C \u092A\u0947 \u0927\u092E\u093E\u0932 \u092E\u091A\u093E \u0930\u0939\u0932 \u092C\u093E"]
    },
    cta: ["\u0905\u092D\u0940 \u0926\u0947\u0916\u0940\u0902 \u0938\u093F\u0930\u094D\u092B \u0938\u094D\u091F\u0947\u091C \u0910\u092A \u092A\u0947", "\u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u0940\u0902 \u0938\u094D\u091F\u0947\u091C \u0910\u092A", "\u090F\u0915 \u0930\u0941\u092A\u093F\u092F\u093E \u092E\u0947\u0902 \u091F\u094D\u0930\u093E\u092F\u0932 \u0932\u0940\u0902"],
    social: ["X \u0932\u093E\u0916 \u0932\u094B\u0917 \u0926\u0947\u0916 \u091A\u0941\u0915\u0932 \u092C\u093E\u0921\u093C\u0928", "UP-Bihar \u092E\u0947\u0902 \u0917\u0930\u094D\u0926\u093E \u092E\u091A\u093E \u0930\u0939\u0932 \u092C\u093E"],
    campaign: {
      fomo: ["\u092C\u0940\u0935\u0940 \u0915\u0940 \u0921\u093E\u0902\u091F lifetime \u0939\u0948 \u092A\u0930 Trial \u0928\u0939\u0940\u0902", "\u092F\u0947 \u092B\u093F\u0932\u094D\u092E \u092E\u093F\u0938 \u0915\u0930 \u0917\u090F \u0924\u094B \u092A\u091B\u0924\u093E\u0913\u0917\u0947"],
      emotional: ["\u0926\u093F\u0932 \u091B\u0942 \u091C\u093E\u0908 \u0908 \u0915\u0939\u093E\u0928\u0940", "\u0906\u0902\u0916 \u092E\u0947\u0902 \u0906\u0902\u0938\u0942 \u0906 \u091C\u093E\u0908"],
      social: ["X \u0932\u093E\u0916 \u0932\u094B\u0917\u094B\u0902 \u0928\u0947 \u0926\u0947\u0916\u093E, \u0906\u092A \u0915\u0939\u093E\u0902 \u0939\u0948\u0902?"],
      urgency: ["Trial \u0916\u0924\u094D\u092E \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u093E \u0939\u0948", "\u0906\u091C \u0939\u0940 \u0926\u0947\u0916\u094B"]
    }
  },
  haryanvi: {
    hooks: {
      comedy: ["\u0907\u0938 \u092B\u093F\u0932\u094D\u092E \u0928\u0948 \u0926\u0947\u0916\u0915\u0948 \u092A\u0947\u091F \u0926\u0930\u094D\u0926 \u0939\u094B \u091C\u094D\u092F\u093E\u0917\u093E", "\u0939\u0902\u0938\u0940 \u0930\u094B\u0915\u0923\u093E \u092E\u0941\u0936\u094D\u0915\u093F\u0932 \u0938\u0948 \u092D\u093E\u0908", "\u092C\u0935\u093E\u0932 \u092E\u091A\u093E \u0930\u093E\u0916\u0940 \u0938\u0948"],
      drama: ["\u0906\u0902\u0916\u094D\u092F\u093E\u0902 \u092E\u0948\u0902 \u0906\u0902\u0938\u0942 \u0906 \u091C\u094D\u092F\u093E\u0902\u0917\u0947", "\u0926\u093F\u0932 \u091B\u0942 \u091C\u094D\u092F\u093E\u0917\u0940 \u092F\u094B \u0915\u0939\u093E\u0923\u0940"],
      default: ["\u092F\u094B \u092B\u093F\u0932\u094D\u092E \u091C\u0930\u0942\u0930 \u0926\u0947\u0916\u094B", "\u0938\u094D\u091F\u0947\u091C \u092A\u0948 \u0927\u092E\u093E\u0932 \u092E\u091A\u093E \u0930\u0939\u0940 \u0938\u0948"]
    },
    cta: ["\u0905\u092D\u0940 \u0926\u0947\u0916\u094B \u0938\u093F\u0930\u094D\u092B \u0938\u094D\u091F\u0947\u091C \u0910\u092A \u092A\u0948", "\u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u094B \u0938\u094D\u091F\u0947\u091C \u0910\u092A"],
    social: ["X \u0932\u093E\u0916 \u0932\u094B\u0917 \u0926\u0947\u0916 \u091A\u0941\u0915\u0947 \u0938\u0948", "\u0939\u0930\u093F\u092F\u093E\u0923\u093E \u092E\u0948\u0902 \u0935\u093E\u092F\u0930\u0932 \u0938\u0948"],
    campaign: {
      fomo: ["\u092C\u0940\u0935\u0940 \u0915\u0940 \u0921\u093E\u0902\u091F lifetime \u0938\u0948 \u092A\u0930 Trial \u0915\u094B\u0928\u0940", "\u092E\u093F\u0938 \u0915\u0930 \u0917\u090F \u0924\u094B \u092A\u091B\u0924\u093E\u0913\u0917\u0947"],
      emotional: ["\u0926\u093F\u0932 \u091B\u0942 \u091C\u094D\u092F\u093E\u0917\u0940 \u092F\u094B \u0915\u0939\u093E\u0923\u0940"],
      social: ["X \u0932\u093E\u0916 \u0932\u094B\u0917\u093E\u0902 \u0928\u0948 \u0926\u0947\u0916\u0940, \u0925\u092E \u0915\u0920\u0948 \u0939\u094B?"],
      urgency: ["\u0906\u091C \u0939\u0940 \u0926\u0947\u0916\u094B", "Trial \u0916\u0924\u092E \u0939\u094B\u0923 \u0906\u0933\u093E \u0938\u0948"]
    }
  },
  hindi: {
    hooks: {
      comedy: ["\u0907\u0938 \u092B\u093F\u0932\u094D\u092E \u0915\u094B \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u092C\u093E\u0926 \u092A\u0947\u091F \u0926\u0930\u094D\u0926 \u0915\u0940 \u0926\u0935\u093E\u0908 \u0932\u0947\u0928\u0940 \u092A\u0921\u093C\u0947\u0917\u0940", "\u0939\u0902\u0938\u0940 \u0930\u094B\u0915\u0928\u093E \u092E\u0941\u0936\u094D\u0915\u093F\u0932 \u0939\u0948", "\u0927\u092E\u093E\u0932 \u092E\u091A\u093E \u0926\u0940 \u0939\u0948"],
      drama: ["\u0906\u0902\u0916\u094B\u0902 \u092E\u0947\u0902 \u0906\u0902\u0938\u0942 \u0906 \u091C\u093E\u090F\u0902\u0917\u0947", "\u0926\u093F\u0932 \u091B\u0942 \u0932\u0947\u0917\u0940 \u092F\u0947 \u0915\u0939\u093E\u0928\u0940"],
      default: ["\u092F\u0947 \u092B\u093F\u0932\u094D\u092E \u091C\u0930\u0942\u0930 \u0926\u0947\u0916\u0947\u0902", "\u0938\u094D\u091F\u0947\u091C \u092A\u0930 \u0927\u092E\u093E\u0932 \u092E\u091A\u093E \u0930\u0939\u0940 \u0939\u0948"]
    },
    cta: ["\u0905\u092D\u0940 \u0926\u0947\u0916\u093F\u090F \u0938\u093F\u0930\u094D\u092B \u0938\u094D\u091F\u0947\u091C \u0910\u092A \u092A\u0930", "\u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u0947\u0902 \u0938\u094D\u091F\u0947\u091C \u0910\u092A", "\u090F\u0915 \u0930\u0941\u092A\u090F \u092E\u0947\u0902 \u091F\u094D\u0930\u093E\u092F\u0932 \u0932\u0947\u0902"],
    social: ["X \u0932\u093E\u0916 \u0932\u094B\u0917 \u0926\u0947\u0916 \u091A\u0941\u0915\u0947 \u0939\u0948\u0902", "\u092A\u0942\u0930\u0947 \u092D\u093E\u0930\u0924 \u092E\u0947\u0902 \u0935\u093E\u092F\u0930\u0932"],
    campaign: {
      fomo: ["\u092C\u0940\u0935\u0940 \u0915\u0940 \u0921\u093E\u0902\u091F lifetime \u0939\u0948 \u092A\u0930 Trial \u0928\u0939\u0940\u0902", "\u092E\u093F\u0938 \u0915\u0930 \u0917\u090F \u0924\u094B \u092A\u091B\u0924\u093E\u0913\u0917\u0947", "\u0938\u092C \u0926\u0947\u0916 \u0930\u0939\u0947 \u0939\u0948\u0902, \u0906\u092A \u0915\u0939\u093E\u0902 \u0939\u0948\u0902?"],
      emotional: ["\u0926\u093F\u0932 \u091B\u0942 \u0932\u0947\u0917\u0940", "\u0906\u0902\u0916\u094B\u0902 \u092E\u0947\u0902 \u0906\u0902\u0938\u0942 \u0906 \u091C\u093E\u090F\u0902\u0917\u0947"],
      social: ["X \u0932\u093E\u0916 \u0932\u094B\u0917\u094B\u0902 \u0928\u0947 \u0926\u0947\u0916\u093E"],
      urgency: ["\u0906\u091C \u0939\u0940 \u0926\u0947\u0916\u094B", "Trial \u0916\u0924\u094D\u092E \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u093E \u0939\u0948"]
    }
  },
  rajasthani: {
    hooks: {
      comedy: ["\u0906 \u092B\u093F\u0932\u094D\u092E \u0926\u0947\u0916\u0923 \u0915\u0947 \u092C\u093E\u0926 \u092A\u0947\u091F \u0926\u0930\u094D\u0926 \u0915\u0940 \u0926\u0935\u093E\u0908 \u0932\u0947\u0923\u0940 \u092A\u0921\u093C\u0938\u0940", "\u0939\u0902\u0938\u0940 \u0930\u094B\u0915\u0923\u094B \u092E\u0941\u0936\u094D\u0915\u093F\u0932 \u0938\u0948"],
      drama: ["\u0906\u0902\u0916\u094D\u092F\u093E\u0902 \u092E\u0948\u0902 \u0906\u0902\u0938\u0942 \u0906 \u091C\u093E\u0938\u0940", "\u0926\u093F\u0932 \u091B\u0942 \u0932\u0947\u0938\u0940 \u0906 \u0915\u0939\u093E\u0923\u0940"],
      default: ["\u0906 \u092B\u093F\u0932\u094D\u092E \u091C\u0930\u0942\u0930 \u0926\u0947\u0916\u094B", "\u0938\u094D\u091F\u0947\u091C \u092A\u0948 \u0927\u092E\u093E\u0932"]
    },
    cta: ["\u0905\u092D\u0940 \u0926\u0947\u0916\u094B \u0938\u093F\u0930\u094D\u092B \u0938\u094D\u091F\u0947\u091C \u0910\u092A \u092A\u0948", "\u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u094B \u0938\u094D\u091F\u0947\u091C \u0910\u092A"],
    social: ["X \u0932\u093E\u0916 \u0932\u094B\u0917 \u0926\u0947\u0916 \u091A\u0941\u0915\u094D\u092F\u093E \u0938\u0948", "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928 \u092E\u0948\u0902 \u0935\u093E\u092F\u0930\u0932"],
    campaign: {
      fomo: ["\u092E\u093F\u0938 \u0915\u0930 \u0917\u092F\u093E \u0924\u094B \u092A\u091B\u0924\u093E\u0938\u0940"],
      emotional: ["\u0926\u093F\u0932 \u091B\u0942 \u0932\u0947\u0938\u0940"],
      social: ["X \u0932\u093E\u0916 \u0932\u094B\u0917\u093E\u0902 \u0926\u0947\u0916\u094D\u092F\u094B"],
      urgency: ["\u0906\u091C \u0939\u0940 \u0926\u0947\u0916\u094B"]
    }
  },
  gujarati: {
    hooks: {
      comedy: ["\u0A86 \u0AAB\u0ABF\u0AB2\u0ACD\u0AAE \u0A9C\u0ACB\u0AAF\u0ABE \u0AAA\u0A9B\u0AC0 \u0AAA\u0AC7\u0A9F \u0AA6\u0AC1\u0A96\u0AB5\u0ABE\u0AA8\u0AC0 \u0AA6\u0AB5\u0ABE \u0AB2\u0AC7\u0AB5\u0AC0 \u0AAA\u0AA1\u0AB6\u0AC7", "\u0AB9\u0AB8\u0AB5\u0AC1\u0A82 \u0AB0\u0ACB\u0A95\u0AB5\u0AC1\u0A82 \u0AAE\u0AC1\u0AB6\u0ACD\u0A95\u0AC7\u0AB2 \u0A9B\u0AC7 \u0AAD\u0ABE\u0A88"],
      drama: ["\u0A86\u0A82\u0A96\u0AAE\u0ABE\u0A82 \u0A86\u0A82\u0AB8\u0AC1 \u0A86\u0AB5\u0AC0 \u0A9C\u0AB6\u0AC7", "\u0AA6\u0ABF\u0AB2 \u0A9B\u0AC2 \u0A9C\u0AB6\u0AC7 \u0A86 \u0AB5\u0ABE\u0AB0\u0ACD\u0AA4\u0ABE"],
      default: ["\u0A86 \u0AAB\u0ABF\u0AB2\u0ACD\u0AAE \u0A9C\u0AB0\u0AC2\u0AB0 \u0A9C\u0AC1\u0A93", "\u0AB8\u0ACD\u0A9F\u0AC7\u0A9C \u0AAA\u0AB0 \u0AA7\u0AAE\u0ABE\u0AB2"]
    },
    cta: ["\u0AB9\u0AAE\u0AA3\u0ABE\u0A82 \u0A9C\u0AC1\u0A93 \u0AAB\u0A95\u0ACD\u0AA4 \u0AB8\u0ACD\u0A9F\u0AC7\u0A9C \u0A8F\u0AAA \u0AAA\u0AB0", "\u0AA1\u0ABE\u0A89\u0AA8\u0AB2\u0ACB\u0AA1 \u0A95\u0AB0\u0ACB \u0AB8\u0ACD\u0A9F\u0AC7\u0A9C \u0A8F\u0AAA"],
    social: ["X \u0AB2\u0ABE\u0A96 \u0AB2\u0ACB\u0A95\u0ACB\u0A8F \u0A9C\u0ACB\u0A88 \u0AB2\u0AC0\u0AA7\u0AC0", "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AAE\u0ABE\u0A82 \u0AB5\u0ABE\u0AAF\u0AB0\u0AB2"],
    campaign: {
      fomo: ["\u0AAE\u0ABF\u0AB8 \u0A95\u0AB0\u0ACD\u0AAF\u0AC1\u0A82 \u0AA4\u0ACB \u0AAA\u0AB8\u0ACD\u0AA4\u0ABE\u0AB6\u0ACB"],
      emotional: ["\u0AA6\u0ABF\u0AB2 \u0A9B\u0AC2 \u0A9C\u0AB6\u0AC7"],
      social: ["X \u0AB2\u0ABE\u0A96 \u0AB2\u0ACB\u0A95\u0ACB\u0A8F \u0A9C\u0ACB\u0A88"],
      urgency: ["\u0A86\u0A9C\u0AC7 \u0A9C \u0A9C\u0AC1\u0A93"]
    }
  },
  marathi: {
    hooks: {
      comedy: ["\u0939\u093E \u0938\u093F\u0928\u0947\u092E\u093E \u092A\u093E\u0939\u093F\u0932\u094D\u092F\u093E\u0935\u0930 \u092A\u094B\u091F\u0926\u0941\u0916\u0940\u091A\u0940 \u0917\u094B\u0933\u0940 \u0918\u094D\u092F\u093E\u0935\u0940 \u0932\u093E\u0917\u0947\u0932", "\u0939\u0938\u0942 \u0906\u0935\u0930\u0923\u0902 \u0915\u0920\u0940\u0923 \u0906\u0939\u0947"],
      drama: ["\u0921\u094B\u0933\u094D\u092F\u093E\u0924 \u092A\u093E\u0923\u0940 \u092F\u0947\u0908\u0932", "\u0915\u093E\u0933\u091C\u093E\u0932\u093E \u0939\u093E\u0924 \u0918\u093E\u0932\u0947\u0932"],
      default: ["\u0939\u093E \u0938\u093F\u0928\u0947\u092E\u093E \u091C\u0930\u0942\u0930 \u092A\u0939\u093E", "\u0938\u094D\u091F\u0947\u091C \u0935\u0930 \u0927\u092E\u093E\u0932"]
    },
    cta: ["\u0906\u0924\u094D\u0924\u093E\u091A \u092A\u0939\u093E \u092B\u0915\u094D\u0924 \u0938\u094D\u091F\u0947\u091C \u0910\u092A \u0935\u0930", "\u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u093E \u0938\u094D\u091F\u0947\u091C \u0910\u092A"],
    social: ["X \u0932\u093E\u0916 \u0932\u094B\u0915\u093E\u0902\u0928\u0940 \u092A\u093E\u0939\u093F\u0932\u093E", "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u093E\u0924 \u0935\u093E\u092F\u0930\u0932"],
    campaign: {
      fomo: ["\u092E\u093F\u0938 \u0915\u0947\u0932\u0902 \u0924\u0930 \u092A\u0936\u094D\u091A\u093E\u0924\u093E\u092A \u0939\u094B\u0908\u0932"],
      emotional: ["\u0915\u093E\u0933\u091C\u093E\u0932\u093E \u0939\u093E\u0924 \u0918\u093E\u0932\u0947\u0932"],
      social: ["X \u0932\u093E\u0916 \u0932\u094B\u0915\u093E\u0902\u0928\u0940 \u092A\u093E\u0939\u093F\u0932\u0902"],
      urgency: ["\u0906\u091C\u091A \u092A\u0939\u093E"]
    }
  }
};

/* --- System Prompts for each module --- */
function buildPromoSystem(data) {
  const lang = data.language || "hindi";
  const templates = LANG_TEMPLATES[lang] || LANG_TEMPLATES.hindi;
  const hooks = templates.hooks[data.genre] || templates.hooks.default || templates.hooks.comedy || [];
  return `You are a promo writer for Stage OTT platform. You write compelling promotional content for movies and shows.

TASK: Generate complete promo content package for a ${data.genre} ${lang} film/show.

OUTPUT FORMAT (use EXACTLY this structure):
=== HOOK LINES (First 3 Seconds) ===
Generate 5 hook lines in ${lang}. These are the first thing the viewer sees/hears. Must be punchy, emotional, curiosity-driven.

=== VO SCRIPT WITH TIMESTAMPS ===
Write a complete voiceover script for a ${data.duration}-second promo in ${lang}.
Format: [START-END] Text
Include: Opening hook, plot teaser, star cast mention, social proof, CTA.
Style: ${data.promoStyle}

=== SOCIAL CAPTIONS ===
Generate 6 social media captions in ${lang} for ${data.platform}. Include emojis and hashtags.

=== TEXT OVERLAYS ===
Generate 4 text overlay suggestions with timestamps and style notes.
Format: [TIME] STYLE: Text

=== CALL-TO-ACTION ===
Generate 4 CTA variations (1 Primary, 3 Secondary) in ${lang}.

REFERENCE HOOKS for ${lang} ${data.genre}: ${hooks.join(" | ")}
REFERENCE CTAs: ${templates.cta.join(" | ")}

RULES:
- Write in authentic ${lang} dialect/script
- Keep hooks under 8 words
- VO script must fit ${data.duration} seconds (roughly 2.5 words/sec)
- Captions should be platform-optimized for ${data.platform}
- Be culturally relevant to Stage OTT's regional audience`;
}

function buildCampaignSystem(data) {
  const lang = data.language || "hindi";
  const templates = LANG_TEMPLATES[lang] || LANG_TEMPLATES.hindi;
  const hookCopies = templates.campaign?.[data.hook] || templates.campaign?.fomo || [];
  const segments = {
    d0d1: "D0-D1: Users who started trial but watched less than 20 min",
    d2d7: "D2-D7: Active users who watched 20+ minutes",
    d2d7dormant: "D2-D7 Dormant: Users who watched less than 20 min",
    m0new: "M0 New Subscribers: New monthly subscribers with no consumption",
    m0active: "M0 Active: Monthly subscribers who started watching",
    m1plus: "M1+ Active: Long-term active subscribers",
    churned: "Recently Churned: Subscription cancelled/expired <30 days"
  };
  return `You are a campaign copywriter for Stage OTT platform. You write push notifications, in-app messages, and marketing copy.

TARGET SEGMENT: ${segments[data.segment] || segments.d0d1}
LANGUAGE: ${lang}
CONTENT/MOVIE: ${data.contentType || "General"}
HOOK STYLE: ${data.hook}

OUTPUT FORMAT:
=== PUSH NOTIFICATION ===
Title: (max 40 chars, with emoji)
Body: (max 100 chars, compelling)

=== COPY VARIATIONS ===
Generate 5 copy variations, each labeled with type:
1. [FOMO] ...
2. [EMOTIONAL] ...
3. [SOCIAL PROOF] ...
4. [URGENCY] ...
5. [HUMOR] ...

=== CTAs ===
Generate 4 call-to-action button texts in ${lang}.

REFERENCE COPIES for ${lang}: ${hookCopies.join(" | ")}
REFERENCE CTAs: ${(templates.cta || []).join(" | ")}

RULES:
- Write in authentic ${lang}
- Push notification must be short and punchy
- Tailor message to the user segment behavior
- Include social proof numbers where relevant (use realistic numbers)
- Be culturally relevant to Stage OTT's regional audience`;
}

function buildTranslateSystem(data) {
  return `You are a professional translator specializing in Indian regional languages for entertainment/OTT content.

TRANSLATE the following text from ${data.sourceLang} to ${data.targetLang}.

STYLE: ${data.style}
- casual: Use everyday conversational tone, slang OK
- formal: Professional, grammatically correct
- dramatic: Theatrical, emotional, cinematic
- funny: Humorous adaptation, puns and wordplay OK

RULES:
- Preserve meaning, emotion, and cultural intent
- Use authentic ${data.targetLang} dialect markers and vocabulary
- Do NOT transliterate \u2014 write in the target language's native script
- Keep proper nouns as-is
- Adapt idioms to ${data.targetLang} equivalents rather than literal translation
- Output ONLY the translated text, no explanations`;
}

function buildScriptSystem(data) {
  return `You are a script writer for Stage OTT platform, specializing in ${data.language} ${data.genre} content.

TASK: Generate a ${data.scenes}-scene script outline.

TITLE: ${data.title || "Untitled"}
GENRE: ${data.genre}
LANGUAGE: ${data.language}
TONE: ${data.tone}
SYNOPSIS: ${data.synopsis || "Create an original story"}

OUTPUT FORMAT for each scene:
${"=".repeat(40)}
SCENE [NUMBER]
${"=".repeat(40)}
LOCATION: [Interior/Exterior] - [Specific place] - [Day/Night]
CHARACTERS: [List characters in scene]

ACTION:
[Describe what happens in the scene - 3-5 lines]

DIALOGUE:
CHARACTER NAME: [Dialogue in ${data.language}]
CHARACTER NAME: [Response in ${data.language}]
[Continue for 4-6 dialogue exchanges per scene]

CAMERA: [Shot suggestions]
MUSIC/SFX: [Sound design notes]
MOOD: [Emotional tone of scene]
${"=".repeat(40)}

RULES:
- All dialogue MUST be in authentic ${data.language}
- Each scene should advance the plot
- Include emotional beats and dramatic moments
- Camera and music notes should be practical
- Genre conventions for ${data.genre} must be followed
- Keep dialogue natural and culturally authentic`;
}

function buildThumbnailSystem(data) {
  return `You are a thumbnail and poster copy specialist for Stage OTT platform.

TASK: Generate thumbnail/poster text content for a ${data.genre} ${data.language} movie/show.

MOVIE/SHOW: ${data.movieName || "Untitled"}
GENRE: ${data.genre}
LANGUAGE: ${data.language}
STYLE: ${data.style}

OUTPUT FORMAT:
=== HEADLINES (5) ===
Short, punchy headlines for thumbnail overlay (max 5 words each) in ${data.language}.
Must grab attention instantly.

=== TAGLINES (4) ===
Slightly longer taglines for posters (max 10 words) in ${data.language}.
Must convey the essence of the content.

=== ENGLISH TAGLINES (3) ===
English taglines that work alongside ${data.language} text.

=== COLOR PALETTE ===
Suggest 3 colors with hex codes that match the ${data.genre} mood and ${data.style} style.
Format: Color Name (#HEX) - Why it works

=== FONT STYLE SUGGESTIONS ===
Suggest 2-3 font styles that would work for thumbnails.

RULES:
- Headlines must be readable at small sizes
- Keep text minimal \u2014 thumbnails need breathing room
- Use power words that trigger clicks
- Colors should evoke the right emotion for ${data.genre}`;
}

function buildCaptionSystem(data) {
  return `You are a social media specialist for Stage OTT platform.

TASK: Generate ${data.count} social media captions for ${data.platform}.

MOVIE/SHOW: ${data.movieName || "Content"}
LANGUAGE: ${data.language}
PLATFORM: ${data.platform}
MOOD: ${data.mood}

OUTPUT FORMAT:
Number each caption. Each caption should include:
- Main text in ${data.language} (with emoji)
- Relevant hashtags (mix of Hindi/English)
- Platform-specific formatting

PLATFORM GUIDELINES:
- Instagram: Visual storytelling, 3-5 hashtags, line breaks for readability
- YouTube: SEO-friendly, question hooks, mention "subscribe"
- Facebook: Conversational, shareable, tag-a-friend format
- Twitter: Short punchy takes, trending hashtag integration, thread potential

MOOD: ${data.mood}
- hype: Exciting, energetic, FOMO-inducing
- funny: Witty, meme-worthy, relatable humor
- emotional: Heartfelt, nostalgic, emotional connection
- mysterious: Suspenseful, curiosity-driven, cliffhanger

RULES:
- Write in authentic ${data.language}
- Each caption should be unique in approach
- Include emojis naturally (not forced)
- Make captions shareable and engagement-friendly
- Reference Stage OTT brand naturally`;
}

/* --- Shared UI components --- */
function StudioSelect({ label, value, onChange, options, darkMode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#a09080" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="clay-inner" style={{
        width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 600,
        color: darkMode ? "#e8e0d4" : "#3d3425",
        background: darkMode ? "linear-gradient(145deg, #231e14, #1c1810)" : "linear-gradient(145deg, #e8e0d4, #ddd5c9)",
        border: "none", outline: "none", cursor: "pointer", fontFamily: "'Inter','Segoe UI',sans-serif",
        borderRadius: "12px", appearance: "none", WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378350f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px"
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function StudioInput({ label, value, onChange, placeholder, darkMode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#a09080" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="clay-inner" style={{
        width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 600,
        color: darkMode ? "#e8e0d4" : "#3d3425",
        background: "transparent", border: "none", outline: "none",
        fontFamily: "'Inter','Segoe UI',sans-serif", boxSizing: "border-box"
      }} />
    </div>
  );
}

function StudioTextArea({ label, value, onChange, placeholder, rows = 3, darkMode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#a09080" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="clay-inner" style={{
        width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 600,
        color: darkMode ? "#e8e0d4" : "#3d3425",
        background: "transparent", border: "none", outline: "none", resize: "none",
        fontFamily: "'Inter','Segoe UI',sans-serif", lineHeight: 1.7, boxSizing: "border-box"
      }} />
    </div>
  );
}

function CopyBtn({ text, darkMode }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="clay-btn" style={{
      padding: "4px 10px", fontSize: "10px", fontWeight: 700, flexShrink: 0,
      color: copied ? "#16a34a" : (darkMode ? "#d4c8b0" : "#78350f")
    }}>
      {copied ? "\u2713" : "\uD83D\uDCCB"}
    </button>
  );
}

/* --- Download helper --- */
function downloadContent(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ========================================
   MAIN COMPONENT
======================================== */
export default function ContentStudio({ darkMode, streamConvert }) {
  const [activeModule, setActiveModule] = useState("promo");
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  // Module form states
  const [promoData, setPromoData] = useState({
    movieName: "", genre: "comedy", language: "bhojpuri", platform: "instagram",
    duration: "30", promoStyle: "storytelling", plotPoints: "", starCast: "", targetEmotion: "hassi"
  });
  const [campaignData, setCampaignData] = useState({
    segment: "d0d1", language: "bhojpuri", contentType: "", hook: "fomo"
  });
  const [transData, setTransData] = useState({
    sourceText: "", sourceLang: "hindi", targetLang: "bhojpuri", style: "casual"
  });
  const [scriptData, setScriptData] = useState({
    title: "", genre: "comedy", language: "bhojpuri", scenes: "3", tone: "dramatic", synopsis: ""
  });
  const [thumbData, setThumbData] = useState({
    movieName: "", genre: "comedy", language: "bhojpuri", style: "dramatic"
  });
  const [captionData, setCaptionData] = useState({
    movieName: "", platform: "instagram", language: "bhojpuri", mood: "hype", count: "10"
  });

  const generate = async () => {
    setIsGenerating(true);
    setError("");
    setOutput("");

    let system = "";
    let userMessage = "";

    try {
      switch (activeModule) {
        case "promo":
          system = buildPromoSystem(promoData);
          userMessage = `Movie: "${promoData.movieName || "Untitled"}"
Star Cast: ${promoData.starCast || "N/A"}
Genre: ${promoData.genre}
Language: ${promoData.language}
Platform: ${promoData.platform}
Duration: ${promoData.duration} seconds
Promo Style: ${promoData.promoStyle}
Plot Points: ${promoData.plotPoints || "N/A"}`;
          break;

        case "campaign":
          system = buildCampaignSystem(campaignData);
          userMessage = `Segment: ${campaignData.segment}
Language: ${campaignData.language}
Content: ${campaignData.contentType || "General Stage OTT content"}
Hook Type: ${campaignData.hook}`;
          break;

        case "translate":
          if (!transData.sourceText.trim()) {
            setError("Please enter text to translate");
            setIsGenerating(false);
            return;
          }
          system = buildTranslateSystem(transData);
          userMessage = transData.sourceText;
          break;

        case "script":
          system = buildScriptSystem(scriptData);
          userMessage = `Title: ${scriptData.title || "Create an original title"}
Genre: ${scriptData.genre}
Language: ${scriptData.language}
Scenes: ${scriptData.scenes}
Tone: ${scriptData.tone}
Synopsis: ${scriptData.synopsis || "Create an original story"}`;
          break;

        case "thumbnail":
          system = buildThumbnailSystem(thumbData);
          userMessage = `Movie/Show: ${thumbData.movieName || "Untitled"}
Genre: ${thumbData.genre}
Language: ${thumbData.language}
Style: ${thumbData.style}`;
          break;

        case "caption":
          system = buildCaptionSystem(captionData);
          userMessage = `Movie/Show: ${captionData.movieName || "Content"}
Platform: ${captionData.platform}
Language: ${captionData.language}
Mood: ${captionData.mood}
Count: ${captionData.count}`;
          break;

        default:
          break;
      }

      await streamConvert({
        model: "anthropic/claude-sonnet-4-5",
        system,
        messages: [{ role: "user", content: userMessage }],
        onChunk: (partial) => setOutput(partial),
      });
    } catch (err) {
      setError(err.message || "Generation failed");
    }

    setIsGenerating(false);
  };

  const handleDownload = () => {
    if (!output) return;
    const moduleLabel = MODULES.find(m => m.id === activeModule)?.label || activeModule;
    downloadContent(output, `stage_${activeModule}_${Date.now()}.txt`);
  };

  const dm = darkMode;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 22px 60px", position: "relative", zIndex: 1 }}>

      {/* Studio Header */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h2 style={{
          fontSize: "28px", fontWeight: 900, letterSpacing: "-1.5px",
          background: "linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", marginBottom: "6px"
        }}>Content Studio</h2>
        <p style={{ fontSize: "12px", color: dm ? "#a09080" : "#92400e", fontWeight: 600 }}>
          AI-Powered Production Suite for Stage OTT
        </p>
      </div>

      {/* Module Tabs */}
      <div className="clay" style={{ padding: 0, marginBottom: "20px", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {MODULES.map(m => {
            const active = activeModule === m.id;
            return (
              <button key={m.id} onClick={() => { setActiveModule(m.id); setOutput(""); setError(""); }} className="clay-btn" style={{
                padding: "10px 16px", fontSize: "12px", fontWeight: active ? 800 : 600,
                color: active ? "#d97706" : (dm ? "#a09080" : "#6b5e50"),
                background: active ? (dm ? "linear-gradient(145deg, rgba(217,119,6,0.15), rgba(217,119,6,0.05))" : "linear-gradient(145deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))") : undefined,
                border: active ? "1.5px solid rgba(245,158,11,0.3)" : undefined,
                display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap"
              }}>
                <span style={{ fontSize: "14px" }}>{m.icon}</span>
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="studio-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Input Panel */}
        <div className="clay" style={{ padding: "18px", overflow: "hidden" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 800, color: dm ? "#d4c8b0" : "#78350f", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>{MODULES.find(m => m.id === activeModule)?.icon}</span>
            {MODULES.find(m => m.id === activeModule)?.label} Settings
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* PROMO WRITER */}
            {activeModule === "promo" && (<>
              <StudioInput label="Movie/Show Name *" value={promoData.movieName} onChange={v => setPromoData({ ...promoData, movieName: v })} placeholder="" darkMode={dm} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Language" value={promoData.language} onChange={v => setPromoData({ ...promoData, language: v })} options={LANGUAGES} darkMode={dm} />
                <StudioSelect label="Genre" value={promoData.genre} onChange={v => setPromoData({ ...promoData, genre: v })} options={GENRES} darkMode={dm} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Platform" value={promoData.platform} onChange={v => setPromoData({ ...promoData, platform: v })} options={[
                  { value: "instagram", label: "Instagram" }, { value: "youtube", label: "YouTube" },
                  { value: "facebook", label: "Facebook" }, { value: "whatsapp", label: "WhatsApp" }
                ]} darkMode={dm} />
                <StudioSelect label="Duration" value={promoData.duration} onChange={v => setPromoData({ ...promoData, duration: v })} options={[
                  { value: "15", label: "15 sec" }, { value: "30", label: "30 sec" },
                  { value: "60", label: "60 sec" }, { value: "120", label: "2 min" }
                ]} darkMode={dm} />
              </div>
              <StudioSelect label="Promo Style" value={promoData.promoStyle} onChange={v => setPromoData({ ...promoData, promoStyle: v })} options={[
                { value: "storytelling", label: "Storytelling" }, { value: "comedy_warning", label: "Comedy Warning" },
                { value: "question", label: "Question Hook" }, { value: "social_proof", label: "Social Proof" },
                { value: "fomo", label: "FOMO" }, { value: "emotional", label: "Emotional" }
              ]} darkMode={dm} />
              <StudioInput label="Star Cast" value={promoData.starCast} onChange={v => setPromoData({ ...promoData, starCast: v })} placeholder="" darkMode={dm} />
              <StudioTextArea label="Plot Points / USP" value={promoData.plotPoints} onChange={v => setPromoData({ ...promoData, plotPoints: v })} placeholder="" darkMode={dm} />
            </>)}

            {/* CAMPAIGN */}
            {activeModule === "campaign" && (<>
              <StudioSelect label="User Segment" value={campaignData.segment} onChange={v => setCampaignData({ ...campaignData, segment: v })} options={[
                { value: "d0d1", label: "D0-D1 (Trial, <20min)" },
                { value: "d2d7", label: "D2-D7 (Active 20+ min)" },
                { value: "d2d7dormant", label: "D2-D7 Dormant" },
                { value: "m0new", label: "M0 New Subscribers" },
                { value: "m0active", label: "M0 Active" },
                { value: "m1plus", label: "M1+ Active" },
                { value: "churned", label: "Recently Churned" }
              ]} darkMode={dm} />
              <StudioSelect label="Language" value={campaignData.language} onChange={v => setCampaignData({ ...campaignData, language: v })} options={LANGUAGES} darkMode={dm} />
              <StudioInput label="Content/Movie Name" value={campaignData.contentType} onChange={v => setCampaignData({ ...campaignData, contentType: v })} placeholder="" darkMode={dm} />
              <StudioSelect label="Hook Type" value={campaignData.hook} onChange={v => setCampaignData({ ...campaignData, hook: v })} options={[
                { value: "fomo", label: "FOMO Play" }, { value: "emotional", label: "Emotional" },
                { value: "social", label: "Social Proof" }, { value: "urgency", label: "Urgency" }
              ]} darkMode={dm} />
            </>)}

            {/* TRANSLATION */}
            {activeModule === "translate" && (<>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="From" value={transData.sourceLang} onChange={v => setTransData({ ...transData, sourceLang: v })} options={LANGUAGES} darkMode={dm} />
                <StudioSelect label="To" value={transData.targetLang} onChange={v => setTransData({ ...transData, targetLang: v })} options={LANGUAGES} darkMode={dm} />
              </div>
              <StudioSelect label="Style" value={transData.style} onChange={v => setTransData({ ...transData, style: v })} options={[
                { value: "casual", label: "Casual / \u092C\u094B\u0932\u091A\u093E\u0932" }, { value: "formal", label: "Formal / \u0914\u092A\u091A\u093E\u0930\u093F\u0915" },
                { value: "dramatic", label: "Dramatic / \u0928\u093E\u091F\u0915\u0940\u092F" }, { value: "funny", label: "Funny / \u092E\u091C\u093C\u0947\u0926\u093E\u0930" }
              ]} darkMode={dm} />
              <StudioTextArea label="Source Text" value={transData.sourceText} onChange={v => setTransData({ ...transData, sourceText: v })} placeholder="" rows={5} darkMode={dm} />
            </>)}

            {/* SCRIPT GEN */}
            {activeModule === "script" && (<>
              <StudioInput label="Title" value={scriptData.title} onChange={v => setScriptData({ ...scriptData, title: v })} placeholder="" darkMode={dm} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Genre" value={scriptData.genre} onChange={v => setScriptData({ ...scriptData, genre: v })} options={GENRES} darkMode={dm} />
                <StudioSelect label="Language" value={scriptData.language} onChange={v => setScriptData({ ...scriptData, language: v })} options={LANGUAGES} darkMode={dm} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Scenes" value={scriptData.scenes} onChange={v => setScriptData({ ...scriptData, scenes: v })} options={[
                  { value: "1", label: "1 Scene" }, { value: "3", label: "3 Scenes" },
                  { value: "5", label: "5 Scenes" }, { value: "10", label: "10 Scenes" }
                ]} darkMode={dm} />
                <StudioSelect label="Tone" value={scriptData.tone} onChange={v => setScriptData({ ...scriptData, tone: v })} options={[
                  { value: "dramatic", label: "Dramatic" }, { value: "comedic", label: "Comedic" },
                  { value: "suspenseful", label: "Suspenseful" }, { value: "romantic", label: "Romantic" }
                ]} darkMode={dm} />
              </div>
              <StudioTextArea label="Synopsis/Outline" value={scriptData.synopsis} onChange={v => setScriptData({ ...scriptData, synopsis: v })} placeholder="" rows={4} darkMode={dm} />
            </>)}

            {/* THUMBNAIL */}
            {activeModule === "thumbnail" && (<>
              <StudioInput label="Movie/Show Name" value={thumbData.movieName} onChange={v => setThumbData({ ...thumbData, movieName: v })} placeholder="" darkMode={dm} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Genre" value={thumbData.genre} onChange={v => setThumbData({ ...thumbData, genre: v })} options={GENRES} darkMode={dm} />
                <StudioSelect label="Language" value={thumbData.language} onChange={v => setThumbData({ ...thumbData, language: v })} options={LANGUAGES} darkMode={dm} />
              </div>
              <StudioSelect label="Style" value={thumbData.style} onChange={v => setThumbData({ ...thumbData, style: v })} options={[
                { value: "dramatic", label: "Dramatic" }, { value: "colorful", label: "Colorful" },
                { value: "minimal", label: "Minimal" }, { value: "bold", label: "Bold" }
              ]} darkMode={dm} />
            </>)}

            {/* CAPTIONS */}
            {activeModule === "caption" && (<>
              <StudioInput label="Movie/Show Name" value={captionData.movieName} onChange={v => setCaptionData({ ...captionData, movieName: v })} placeholder="" darkMode={dm} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Platform" value={captionData.platform} onChange={v => setCaptionData({ ...captionData, platform: v })} options={[
                  { value: "instagram", label: "Instagram" }, { value: "facebook", label: "Facebook" },
                  { value: "youtube", label: "YouTube" }, { value: "twitter", label: "Twitter" }
                ]} darkMode={dm} />
                <StudioSelect label="Language" value={captionData.language} onChange={v => setCaptionData({ ...captionData, language: v })} options={LANGUAGES} darkMode={dm} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Mood" value={captionData.mood} onChange={v => setCaptionData({ ...captionData, mood: v })} options={[
                  { value: "hype", label: "Hype" }, { value: "funny", label: "Funny" },
                  { value: "emotional", label: "Emotional" }, { value: "mysterious", label: "Mysterious" }
                ]} darkMode={dm} />
                <StudioSelect label="Count" value={captionData.count} onChange={v => setCaptionData({ ...captionData, count: v })} options={[
                  { value: "5", label: "5 Captions" }, { value: "10", label: "10 Captions" },
                  { value: "15", label: "15 Captions" }
                ]} darkMode={dm} />
              </div>
            </>)}

            {/* Generate Button */}
            <button onClick={generate} disabled={isGenerating} className="clay-btn-primary" style={{
              width: "100%", padding: "13px", borderRadius: "14px", border: "none",
              cursor: isGenerating ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "4px"
            }}>
              {isGenerating ? (
                <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Generating...</>
              ) : (
                <>\u26A1 Generate {MODULES.find(m => m.id === activeModule)?.label}</>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="clay" style={{ padding: "18px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 800, color: dm ? "#d4c8b0" : "#78350f", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px" }}>{"\uD83D\uDCE4"}</span> Output
              {isGenerating && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b", display: "inline-block", animation: "pulse 1s ease-in-out infinite" }} />}
            </h3>
            {output && !isGenerating && (
              <div style={{ display: "flex", gap: "8px" }}>
                <CopyBtn text={output} darkMode={dm} />
                <button onClick={handleDownload} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: "#16a34a" }}>
                  {"\u2B07"} Download
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="clay-inner" style={{ padding: "12px 14px", marginBottom: "12px", color: "#dc2626", fontSize: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
              <span>{"\u26A0"}</span> {error}
            </div>
          )}

          <div className="clay-inner" style={{
            flex: 1, minHeight: "300px", maxHeight: "500px", overflowY: "auto",
            padding: "16px", fontSize: "13px", lineHeight: 1.9,
            color: dm ? "#e8e0d4" : "#3d3425", whiteSpace: "pre-wrap"
          }}>
            {output ? (
              <>
                {output}
                {isGenerating && <span style={{ display: "inline-block", width: "2px", height: "16px", background: "#f59e0b", marginLeft: "2px", verticalAlign: "text-bottom", animation: "pulse 0.8s ease-in-out infinite" }} />}
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: dm ? "#6b5e50" : "#a08060", fontSize: "13px", fontWeight: 600, textAlign: "center" }}>
                {isGenerating ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "14px" }}>
                      {[0, 1, 2].map(i => <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#d97706)", animation: `pulse 1.3s ${i * 0.22}s ease-in-out infinite` }} />)}
                    </div>
                    Generating content...
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "32px", marginBottom: "12px" }}>{MODULES.find(m => m.id === activeModule)?.icon}</div>
                    Fill the form and click Generate
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media(max-width:700px){
          .studio-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
