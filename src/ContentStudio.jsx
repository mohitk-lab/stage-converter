import { useState, useRef, useEffect } from "react";

/* ========================================
   STAGE CONTENT STUDIO
   6 AI-powered modules for Stage OTT
======================================== */

const MODULES = [
  { id: "promo", icon: "\uD83C\uDFAC", label: "Promo Writer" },
  { id: "campaign", icon: "\uD83D\uDCE2", label: "Campaign" },
  { id: "synopsis", icon: "\uD83D\uDCD6", label: "Story Synopsis" },
  { id: "caption", icon: "\uD83D\uDCAC", label: "Captions" },
  { id: "headline", icon: "\uD83D\uDCF0", label: "Headline" },
  { id: "learning", icon: "\uD83E\uDDE0", label: "Learning" },
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

/* --- Reference VO narration examples for promo writer --- */
const PROMO_VO_EXAMPLES = {
  bhojpuri: `=== VO Example 1 (Overall Story) ===
रात में जब शिवम सुतल रहल त ओकर उम्र 12 साल के रहल, लेकिन जइसही भोरे उठलस त ओकर उम्र पैंतालिस साल हो गइल अउर आपन नाम अजय बोले लागल. ई सुनके माई-बाप के लागल की शिवम अभी सपने में बड़बड़ा रहल बा, मगर अब शिवम पूरी तरह से बदल गइल बा. गांव में जे भी ओकरा के शिवम कहेला त ऊ चिढ़ जाला. सवाल बा कि एक रात में 12 साल के लइका कैसे पैंतालिस साल के हो गइल. ई सवाल के जवाब आपलोग के स्टेज ओटीटी ऐप पे मौजूद फिल्म पुनर्जनम में मिली. पूरा रहस्य जानें खातिर देखीं सच्ची घटना पे आधारित फिल्म पुनर्जनम.

=== VO Example 2 (Character Angle) ===
एक अमीरजादी लड़की एतना मनबढ़ु बाड़ी की अपना सामने गरीब के जानवर से भी बदत्तर समझेली. पइसा के नशा में एतना अंधा हो गइल बाड़ी की गरीब लोगन के हमेशा मजाक उड़ावेली. हद त तब हो गइल, जब बाप से धोखा करके कंपनी के बागडोर आपन हाथ में ले लिहली. जिनगी में मोड़ तब आइल जब बचपन के दोस्त के मंगेतर पसंद आ गइल, अब घमंडी लड़की ऊ लइका के पावे खातिर दिन रात प्लानिंग करे लागली. सवाल बा कि का सच में बदलाव भइल या ई कौनो नया चाल बा. सबकुछ जानें खातिर देखीं जिद्दी सिर्फ स्टेज ऐप पे.`,
  hindi: `=== VO Example 1 (Overall Story) ===
रात को जब शिवम सोया था तो उसकी उम्र 12 साल थी, लेकिन सुबह उठते ही उसकी उम्र पैंतालीस साल हो गई और अपना नाम अजय बताने लगा. माँ-बाप को लगा कि शिवम सपने में बड़बड़ा रहा है, मगर शिवम पूरी तरह बदल चुका था. गांव में जो भी उसे शिवम कहता वो चिढ़ जाता. सवाल ये है कि एक रात में 12 साल का बच्चा कैसे पैंतालीस साल का हो गया. इस सवाल का जवाब आपको स्टेज ओटीटी ऐप पर मौजूद फिल्म पुनर्जनम में मिलेगा.

=== VO Example 2 (Character Angle) ===
एक अमीर घमंडी लड़की जो गरीबों को जानवर से भी बदतर समझती है. पैसे के नशे में इतनी अंधी कि गरीब लोगों का हमेशा मज़ाक उड़ाती है. हद तब हो गई जब बाप से धोखा करके कंपनी अपने हाथ में ले ली. ज़िंदगी में मोड़ तब आया जब बचपन की दोस्त का मंगेतर पसंद आ गया. सवाल ये है कि क्या सच में बदलाव हुआ या ये कोई नई चाल है. सबकुछ जानने के लिए देखिए जिद्दी सिर्फ स्टेज ऐप पर.`
};

/* --- System Prompts for each module --- */
function buildPromoSystem(data, dialectRulesMap) {
  const lang = data.language || "hindi";
  const templates = LANG_TEMPLATES[lang] || LANG_TEMPLATES.hindi;
  const hooks = templates.hooks[data.genre] || templates.hooks.default || templates.hooks.comedy || [];
  const voExamples = PROMO_VO_EXAMPLES[lang] || PROMO_VO_EXAMPLES.bhojpuri;
  const dialectRule = dialectRulesMap?.[lang] || "";
  return `You are a promo VO narration writer for Stage OTT platform. You write story-driven voiceover scripts that hook viewers and make them download the Stage app.

TASK: Generate 6-8 complete VO narration scripts for a ${data.genre} ${lang} film/show.

EACH VO MUST:
- Be a self-contained narration paragraph (150-250 words)
- Flow as pure storytelling narration — NO timestamps, NO section headers, NO bullet points within each VO
- Follow this arc: Curiosity Hook → Story Setup → Suspense/Mystery Build → Natural CTA woven in
- Be written from a DIFFERENT perspective/angle
- Use authentic ${lang} dialect throughout
- Weave the CTA naturally into the story (e.g., "सबकुछ जानें खातिर देखीं [film name] सिर्फ स्टेज ऐप पे")
- Each VO should feel like a mini-story that makes the listener NEED to watch the film

PERSPECTIVES TO COVER (pick 6-8):
1. Overall Story — the film's big picture narrative hook
2. Character Angle — one key character's journey or flaw
3. Relationship Angle — a central relationship dynamic or conflict
4. Emotional Angle — the core emotional conflict that tugs heartstrings
5. Comedy/Entertainment — the fun, entertainment, or shock value
6. Mystery/Suspense — what you don't know yet, the unanswered question
7. Social/Cultural — relevance to audience's life and society
8. Audience/Fan — why viewers are going crazy over this film

OUTPUT FORMAT:
=== VO 1: [PERSPECTIVE NAME] ===
[Complete narration paragraph — pure flowing story, no formatting]

=== VO 2: [PERSPECTIVE NAME] ===
[Complete narration paragraph]

... (continue for 6-8 VOs)

WRITING TECHNIQUES:
- Open with a shocking fact, impossible situation, or emotional gut-punch
- Build suspense using rhetorical questions ("सवाल बा कि...")
- Create cliffhangers ("का शिवम पागल बा, या सच में पुनर्जनम भइल बा")
- End each VO with a natural CTA that feels like part of the story
- Use repetition for dramatic effect
- Paint vivid scenes the listener can visualize

REFERENCE HOOKS for ${lang} ${data.genre}: ${hooks.join(" | ")}

${dialectRule ? `DIALECT RULES (MUST FOLLOW for ${lang}):\n${dialectRule.substring(0, 600)}\n` : ""}

REFERENCE VO EXAMPLES (match this narration style):
${voExamples}

RULES:
- Write in authentic ${lang} dialect/script
- NEVER include timestamps like [00:01-00:05] — pure narration only
- Each VO is a complete story, NOT a list or bullet points
- CTAs must feel like a natural part of the narrative
- Make every VO so gripping the listener cannot stop midway
- Platform: ${data.platform} — optimize narration length accordingly
- Promo Style: ${data.promoStyle}`;
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

function buildSynopsisSystem() {
  return `You are a story analyst for Stage OTT platform. Your job is to deeply analyze a story/synopsis and extract key elements that will be useful for promotional content writing.

TASK: Analyze the given story and extract a structured breakdown.

OUTPUT FORMAT:

=== STORY TITLE ===
[Title or suggested title]

=== GENRE & TONE ===
[Primary genre, sub-genre, overall tone]

=== ONE-LINE HOOK ===
[A single powerful line that captures the story's essence — written to grab attention]

=== PLOT SUMMARY (5-7 lines) ===
[Concise plot summary covering setup, conflict, climax]

=== KEY CHARACTERS ===
- [Character Name]: [Role + key trait + emotional arc in 1 line]
(list all major characters)

=== CENTRAL CONFLICT ===
[What is the main conflict/tension that drives the story]

=== EMOTIONAL HOOKS ===
[List 4-5 emotional moments/angles that can be used in promos]

=== MYSTERY/SUSPENSE ELEMENTS ===
[What questions will the audience want answered? What creates curiosity?]

=== KEY RELATIONSHIPS ===
[Important relationship dynamics — love, rivalry, family bonds, betrayal etc.]

=== CULTURAL/SOCIAL RELEVANCE ===
[How does this story connect to audience's real life, society, culture?]

=== PROMO-WORTHY MOMENTS ===
[List 5-6 specific scenes/moments that would make great promo hooks]

=== TARGET AUDIENCE ===
[Who would this story appeal to most and why]

=== STAR CAST ANGLES ===
[If any actors/cast mentioned, note promotional angles for them]

RULES:
- Be thorough but concise
- Focus on elements that are USEFUL for writing promotional content (VOs, captions, headlines, campaigns)
- Identify the strongest emotional and curiosity hooks
- Think like a marketer — what makes someone NEED to watch this?
- If the story is in a regional language, preserve key dialogue/phrases that could be used in promos`;
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

function buildCaptionSystem(data, dialectRulesMap) {
  const dialectRule = dialectRulesMap?.[data.language] || "";
  return `You are an expert social media content creator for Stage OTT platform, specializing in viral regional language content.

TASK: Generate ${data.count} scroll-stopping social media captions for ${data.platform}.

MOVIE/SHOW: ${data.movieName || "Content"}
LANGUAGE: ${data.language}
PLATFORM: ${data.platform}
MOOD: ${data.mood}
${data.styleDescription ? `STYLE REFERENCE: ${data.styleDescription}` : ""}
${data.vocabularyPrefs ? `VOCABULARY PREFERENCES: ${data.vocabularyPrefs}` : ""}
${data.tonePatterns ? `TONE PATTERNS: ${data.tonePatterns}` : ""}

OUTPUT FORMAT:
Number each caption. Each caption should include:
- Main text in ${data.language} (with emoji)
- Relevant hashtags (mix of ${data.language}/English)
- Platform-specific formatting

ENGAGEMENT TECHNIQUES (use in EVERY caption):
- Start with a HOOK: shocking question, emotional trigger, relatable situation, or bold statement
- Use pattern interrupts: unexpected twists, contradictions, "wait till you see..." moments
- Create emotional triggers: nostalgia, pride, FOMO, curiosity, humor, outrage
- End with engagement drivers: questions, polls, "tag someone who...", debate starters, cliff-hangers
- Use the storytelling approach — don't just describe, NARRATE

CAPTION FORMATS TO MIX:
- Question hook ("क्या आपने कभी सोचा कि...")
- Bold statement ("ये फिल्म आपकी नींद उड़ा देगी")
- Relatable situation ("जब आपकी माँ ये फिल्म देखे...")
- Quote from film (a powerful dialogue)
- Fan reaction style ("10 लाख लोग रो पड़े इस सीन पर")
- Challenge/dare ("हिम्मत है तो अकेले देखो")

PLATFORM GUIDELINES:
- Instagram: Visual storytelling, 3-5 hashtags, line breaks for readability, carousel-friendly
- YouTube: SEO-friendly, question hooks, comment-bait, mention "subscribe"
- Facebook: Conversational, shareable, tag-a-friend, debate-starting
- Twitter: Short punchy takes, trending hashtag integration, ratio potential

MOOD: ${data.mood}
- hype: Explosive energy, FOMO, "everyone's watching this"
- funny: Witty wordplay, meme-worthy, regional humor and inside jokes
- emotional: Heartfelt, nostalgic, tear-jerking, family sentiment
- mysterious: Suspenseful, curiosity gaps, "you won't believe what happens"

${dialectRule ? `DIALECT RULES (CRITICAL — MUST FOLLOW for authentic ${data.language}):\n${dialectRule.substring(0, 500)}\n` : ""}

RULES:
- Write in AUTHENTIC ${data.language} — use real dialect, not textbook language
- Each caption must be UNIQUE in approach, angle, and format
- Emojis should feel natural, not forced
- Every caption must make the reader want to share, comment, or watch
- Reference Stage OTT/Stage App naturally
- If sample scripts are provided, match that writing style exactly
- Think like a viral content creator, not a copywriter`;
}

/* --- Headline System Prompt --- */
function buildHeadlineSystem(data, dialectRulesMap) {
  const dialectRule = dialectRulesMap?.[data.language] || "";
  return `You are an expert headline and thumbnail copy specialist for Stage OTT platform. You write headlines that STOP the scroll and FORCE the click.

TASK: Generate ${data.count} scroll-stopping headlines.

MOVIE/SHOW: ${data.movieName || "Content"}
LANGUAGE: ${data.language}
PLATFORM: ${data.platform}
TONE: ${data.tone}
${data.styleDescription ? `STYLE REFERENCE: ${data.styleDescription}` : ""}
${data.vocabularyPrefs ? `VOCABULARY PREFERENCES: ${data.vocabularyPrefs}` : ""}
${data.tonePatterns ? `TONE PATTERNS: ${data.tonePatterns}` : ""}

OUTPUT FORMAT:
Number each headline. For each include:
- Main headline text in ${data.language}
- A short subtitle/subheadline (optional)
- Where it works best (thumbnail, push notification, social post, email)

SCROLL-STOPPING TECHNIQUES (use these):
- Power words: shocking, exclusive, secret, heartbreaking, hilarious, controversial
- Curiosity gaps: create information gaps ("...जो कोई नहीं जानता", "...के बाद जो हुआ")
- Numbers & specifics: "5 reasons...", "the one scene that..."
- Controversy/debate: take a stance, create discussion, provoke opinion
- Personal/relatable: "जब आपकी...", "वो moment जब..."
- Urgency markers: "अभी देखो", "miss मत करो"
- Incomplete stories: leave the reader needing to know more

HEADLINE FORMATS TO MIX:
- Question headlines (provocative, rhetorical)
- Bold statement headlines (controversial claims)
- "How/Why" headlines (explanatory hooks)
- List headlines ("3 reasons...", "5 scenes...")
- Quote/dialogue headlines (powerful film lines)
- Emotional headlines (tug at heartstrings)
- Shock-value headlines (unexpected facts)
- Fan-reaction headlines ("10 लाख लोग...")

TONE GUIDELINES:
- catchy: Click-worthy, curiosity gaps, "you won't believe" energy
- dramatic: Bold, impactful, high emotional stakes, cinematic
- funny: Witty wordplay, meme-worthy, regional humor puns
- urgent: Time-sensitive, FOMO, breaking-news, "limited time" feel
- emotional: Heartfelt, relatable, family sentiment, tear-jerking

${dialectRule ? `DIALECT RULES (CRITICAL — MUST FOLLOW for authentic ${data.language}):\n${dialectRule.substring(0, 500)}\n` : ""}

RULES:
- Write in AUTHENTIC ${data.language} dialect — not textbook, but real spoken language
- Each headline must be UNIQUE in format, angle, and technique
- Keep headlines punchy (under 15 words for thumbnails, under 25 for social)
- Every headline must create an irresistible urge to click/watch
- Reference Stage OTT/Stage App where natural
- If sample scripts are provided, match that writing style exactly
- Think YouTube thumbnail + push notification — every word counts`;
}

/* --- Learning System Prompt --- */
function buildLearningSystem(personaName, description) {
  return `You are an expert writing analyst specializing in promotional content for entertainment/OTT platforms.

TASK: Deeply analyze the following promo scripts to build a "writing fingerprint" for the writer named "${personaName}".
${description ? `Writer description: ${description}` : ""}

Analyze the scripts for:
1. Overall writing style and voice
2. Tone patterns (energetic, subtle, dramatic, humorous, etc.)
3. Vocabulary preferences and distinctive word choices
4. Sentence structure patterns (length, complexity, rhythm)
5. How they write hooks/openings
6. How they write CTAs/closings
7. Emotional register and manipulation techniques
8. Cultural references and markers
9. Language mixing patterns (pure Hindi, Hinglish, dialect-heavy etc.)
10. Any signature phrases or constructions

OUTPUT FORMAT (use EXACTLY this structure):

PERSONA: ${personaName}
---
WRITING_STYLE_SUMMARY: [2-3 sentence overview of this writer's style]
TONE: [comma-separated tone descriptors]
VOCABULARY_PATTERNS: [distinctive words, phrases, idioms used frequently]
SENTENCE_STRUCTURE: [short/long, simple/complex, rhythm patterns]
HOOK_STYLE: [how they open promos - patterns and examples]
CTA_PATTERNS: [how they close/call-to-action - patterns]
EMOTIONAL_REGISTER: [primary emotions evoked and techniques]
CULTURAL_MARKERS: [regional/cultural references typical to this writer]
LANGUAGE_MIX: [e.g., pure Hindi, Hinglish, dialect-heavy Bhojpuri]
SIGNATURE_PHRASES: [any recurring phrases or constructions]
---
RAW_STYLE_INSTRUCTION: [Write a single comprehensive paragraph that, when injected into a system prompt, would make an AI write exactly like this persona. Be specific and actionable. This is the most important part.]

RULES:
- Be specific with examples from the provided scripts
- This fingerprint will be used to mimic this writing style, so be precise
- Keep total output under 800 words for token efficiency
- Focus on actionable, reproducible style traits`;
}

/* --- localStorage helpers --- */
function loadPersonas() {
  try { return JSON.parse(localStorage.getItem("stage_personas") || "[]"); } catch { return []; }
}
function savePersonas(p) {
  localStorage.setItem("stage_personas", JSON.stringify(p));
}
function loadActivePersonas() {
  try { return JSON.parse(localStorage.getItem("stage_active_persona") || "{}"); } catch { return {}; }
}
function saveActivePersonas(m) {
  localStorage.setItem("stage_active_persona", JSON.stringify(m));
}

/* --- Shared UI components --- */
function StudioSelect({ label, value, onChange, options, darkMode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#b0a090" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="clay-inner" style={{
        width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 600,
        color: darkMode ? "#e8e0d4" : "#3d3425",
        background: darkMode ? "linear-gradient(145deg, #0d0d0d, #080808)" : "linear-gradient(145deg, #e8e0d4, #ddd5c9)",
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
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#b0a090" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
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
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#b0a090" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
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

function PersonaSelector({ moduleId, personas, activePersonaMap, onSelect, darkMode }) {
  if (!personas || personas.length === 0) return null;
  const currentId = activePersonaMap[moduleId] || "";
  return (
    <StudioSelect
      label="Writing Persona"
      value={currentId}
      onChange={(v) => onSelect(moduleId, v || null)}
      options={[
        { value: "", label: "Default (No Persona)" },
        ...personas.map(p => ({ value: p.id, label: p.name }))
      ]}
      darkMode={darkMode}
    />
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

/* --- Tone Analysis (client-side keyword matching) --- */
const TONE_KEYWORDS = {
  dramatic: [
    "shocking", "heartbreaking", "devastating", "explosive", "unbelievable", "incredible",
    "dangerous", "destroy", "death", "murder", "revenge", "betray", "sacrifice", "scream",
    "cry", "tears", "blood", "fire", "storm", "war", "fight", "clash", "rage", "fury",
    // Hindi/regional dramatic words
    "\u0906\u0902\u0938\u0942", "\u0930\u094B", "\u091A\u0940\u0916", "\u0926\u0930\u094D\u0926", "\u0924\u092C\u093E\u0939\u0940", "\u092C\u0930\u094D\u092C\u093E\u0926",
    "\u0916\u0942\u0928", "\u092E\u094C\u0924", "\u0939\u0924\u094D\u092F\u093E", "\u092C\u0926\u0932\u093E", "\u0915\u0941\u0930\u094D\u092C\u093E\u0928\u0940",
    "\u0927\u094B\u0916\u093E", "\u091C\u0932\u0928", "\u0924\u092C\u093E\u0939", "\u0906\u0917", "\u0924\u0942\u092B\u093E\u0928",
    "\u091C\u0902\u0917", "\u0932\u0921\u093C\u093E\u0908", "\u091F\u0915\u0930\u093E\u0935", "\u0917\u0941\u0938\u094D\u0938\u093E",
  ],
  warm: [
    "love", "heart", "family", "together", "beautiful", "dream", "hope", "inspire",
    "smile", "laugh", "joy", "happy", "celebrate", "friend", "hug", "miss", "care",
    // Hindi/regional warm words
    "\u092A\u094D\u092F\u093E\u0930", "\u0926\u093F\u0932", "\u092A\u0930\u093F\u0935\u093E\u0930", "\u0916\u0941\u0936\u0940", "\u0938\u092A\u0928\u093E",
    "\u0909\u092E\u094D\u092E\u0940\u0926", "\u0939\u0902\u0938\u0940", "\u092E\u0941\u0938\u094D\u0915\u0941\u0930\u093E\u0928", "\u091C\u0936\u094D\u0928",
    "\u0926\u094B\u0938\u094D\u0924", "\u092E\u093E\u0902", "\u092C\u093E\u092A",
  ],
  neutral: [
    "watch", "download", "app", "new", "release", "available", "now", "today",
    "trial", "subscribe", "click", "link", "platform", "content", "episode",
    "\u0926\u0947\u0916\u094B", "\u0921\u093E\u0909\u0928\u0932\u094B\u0921", "\u0928\u092F\u093E", "\u0910\u092A",
  ],
};

function analyzeTone(text) {
  if (!text || text.length < 20) return { value: 50, label: "Neutral" };
  const lower = text.toLowerCase();
  let dramaticScore = 0;
  let warmScore = 0;
  let neutralScore = 0;

  for (const word of TONE_KEYWORDS.dramatic) {
    const regex = new RegExp(word, "gi");
    const matches = lower.match(regex);
    if (matches) dramaticScore += matches.length * 3;
  }
  for (const word of TONE_KEYWORDS.warm) {
    const regex = new RegExp(word, "gi");
    const matches = lower.match(regex);
    if (matches) warmScore += matches.length * 2;
  }
  for (const word of TONE_KEYWORDS.neutral) {
    const regex = new RegExp(word, "gi");
    const matches = lower.match(regex);
    if (matches) neutralScore += matches.length;
  }

  const total = dramaticScore + warmScore + neutralScore || 1;
  // 0 = fully neutral, 100 = fully dramatic, 50 = warm midpoint
  const ratio = ((warmScore * 0.5 + dramaticScore * 1.0) / total) * 100;
  const clamped = Math.min(100, Math.max(0, Math.round(ratio)));

  let label = "Neutral";
  if (clamped > 75) label = "Dramatic";
  else if (clamped > 55) label = "Emotional";
  else if (clamped > 35) label = "Warm";
  else if (clamped > 15) label = "Mild";

  return { value: clamped, label };
}

const HASHTAG_PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter" },
  { value: "whatsapp", label: "WhatsApp" },
];

/* ========================================
   MAIN COMPONENT
======================================== */
export default function ContentStudio({ darkMode, streamConvert, dialectRules = {} }) {
  const [activeModule, setActiveModule] = useState("promo");
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [previousOutput, setPreviousOutput] = useState("");
  const [error, setError] = useState("");
  const [abMode, setAbMode] = useState(false);
  const [variantB, setVariantB] = useState("");

  // Hashtag Generator states
  const [hashtagsResult, setHashtagsResult] = useState("");
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [hashtagPlatform, setHashtagPlatform] = useState("instagram");

  // Tone Meter states
  const [toneMeterValue, setToneMeterValue] = useState(50);
  const [toneMeterLabel, setToneMeterLabel] = useState("Neutral");

  // Module form states
  const [promoData, setPromoData] = useState({
    movieName: "", genre: "comedy", language: "bhojpuri", platform: "instagram",
    duration: "30", promoStyle: "storytelling", plotPoints: "", starCast: "", targetEmotion: "hassi"
  });
  const [campaignData, setCampaignData] = useState({
    segment: "d0d1", language: "bhojpuri", contentType: "", hook: "fomo"
  });
  const [synopsisData, setSynopsisData] = useState({
    movieName: "", storyText: "", googleLink: ""
  });
  const [synopsisFetchingDoc, setSynopsisFetchingDoc] = useState(false);
  const [savedSynopsis, setSavedSynopsis] = useState(() => {
    try { return JSON.parse(localStorage.getItem("stage_story_synopsis") || "null"); } catch { return null; }
  });
  const [captionData, setCaptionData] = useState({
    movieName: "", platform: "instagram", language: "bhojpuri", mood: "hype", count: "10",
    styleDescription: "", vocabularyPrefs: "", tonePatterns: "", scriptInput: ""
  });
  const [headlineData, setHeadlineData] = useState({
    movieName: "", language: "bhojpuri", platform: "instagram", tone: "catchy", count: "10",
    styleDescription: "", vocabularyPrefs: "", tonePatterns: "", scriptInput: ""
  });

  // Persona & Learning state
  const [personas, setPersonas] = useState(() => loadPersonas());
  const [activePersonaMap, setActivePersonaMap] = useState(() => loadActivePersonas());
  const [learningData, setLearningData] = useState({
    personaName: "", styleDescription: "", vocabularyPrefs: "", tonePatterns: "",
    scriptInput: "", googleLink: ""
  });

  const handlePersonaSelect = (moduleId, personaId) => {
    const updated = { ...activePersonaMap, [moduleId]: personaId };
    setActivePersonaMap(updated);
    saveActivePersonas(updated);
  };

  const deletePersona = (id) => {
    const updated = personas.filter(p => p.id !== id);
    setPersonas(updated);
    savePersonas(updated);
    const updatedMap = { ...activePersonaMap };
    for (const key of Object.keys(updatedMap)) {
      if (updatedMap[key] === id) updatedMap[key] = null;
    }
    setActivePersonaMap(updatedMap);
    saveActivePersonas(updatedMap);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    let combined = learningData.scriptInput;
    for (const file of files) {
      const text = await file.text();
      combined += (combined ? "\n\n---\n\n" : "") + text;
    }
    setLearningData({ ...learningData, scriptInput: combined });
  };

  const handleSynopsisFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    let combined = synopsisData.storyText;
    for (const file of files) {
      const text = await file.text();
      combined += (combined ? "\n\n---\n\n" : "") + text;
    }
    setSynopsisData({ ...synopsisData, storyText: combined });
  };

  const fetchSynopsisDocLink = async () => {
    const link = synopsisData.googleLink.trim();
    if (!link) return;
    setSynopsisFetchingDoc(true);
    setError("");
    try {
      const res = await fetch("/api/fetch-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not fetch document");
      const newText = synopsisData.storyText + (synopsisData.storyText ? "\n\n---\n\n" : "") + data.text;
      setSynopsisData({ ...synopsisData, storyText: newText, googleLink: "" });
    } catch (err) {
      setError(err.message || "Failed to fetch document");
    }
    setSynopsisFetchingDoc(false);
  };

  const [fetchingDoc, setFetchingDoc] = useState(false);

  const fetchDocumentLink = async () => {
    const link = learningData.googleLink.trim();
    if (!link) return;
    setFetchingDoc(true);
    setError("");
    try {
      const res = await fetch("/api/fetch-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not fetch document");
      const newText = learningData.scriptInput + (learningData.scriptInput ? "\n\n---\n\n" : "") + data.text;
      setLearningData({ ...learningData, scriptInput: newText, googleLink: "" });
    } catch (err) {
      setError(err.message || "Failed to fetch document");
    }
    setFetchingDoc(false);
  };

  const handleUndo = () => {
    if (previousOutput && previousOutput !== output) {
      setOutput(previousOutput);
      setPreviousOutput("");
    }
  };

  // Auto-calculate tone meter when output changes
  useEffect(() => {
    if (output && !isGenerating) {
      const tone = analyzeTone(output);
      setToneMeterValue(tone.value);
      setToneMeterLabel(tone.label);
    }
  }, [output, isGenerating]);

  // Reset hashtags when output clears or module changes
  useEffect(() => {
    setHashtagsResult("");
  }, [activeModule]);

  const generateHashtags = async () => {
    if (!output || hashtagLoading) return;
    setHashtagLoading(true);
    setHashtagsResult("");

    const platformStyles = {
      instagram: "Generate 20-25 hashtags optimized for Instagram Reels/Posts discovery. Mix popular high-volume hashtags with niche specific ones. Include a mix of English and regional language hashtags. Format: space-separated hashtags, each starting with #.",
      youtube: "Generate 15-20 hashtags optimized for YouTube Shorts/Video SEO. Focus on searchable, trending, and descriptive tags. Keep them concise. Format: space-separated hashtags, each starting with #.",
      twitter: "Generate 5-8 hashtags optimized for Twitter/X. Focus on trending, concise, punchy tags that fit tweet character limits. Mix viral potential with content relevance. Format: space-separated hashtags, each starting with #.",
      whatsapp: "Generate 8-12 hashtags suitable for WhatsApp Status/forwards. Keep them simple, relatable, and shareable. Focus on emotional and cultural resonance. Format: space-separated hashtags, each starting with #.",
    };

    try {
      await streamConvert({
        model: "anthropic/claude-sonnet-4-5",
        system: `You are a social media hashtag specialist for Stage OTT platform. Analyze the given content and generate highly relevant, platform-optimized hashtags.\n\n${platformStyles[hashtagPlatform] || platformStyles.instagram}\n\nRULES:\n- Output ONLY the hashtags, nothing else\n- No explanations, no numbering, no categories\n- Each hashtag on the same line separated by spaces\n- Mix of English and regional language hashtags\n- Include #StageApp #StageOTT always`,
        messages: [{ role: "user", content: `Generate ${hashtagPlatform} hashtags for this content:\n\n${output.slice(0, 1500)}` }],
        onChunk: (partial) => setHashtagsResult(partial),
      });
    } catch (err) {
      setError("Hashtag generation failed: " + (err.message || "Unknown error"));
    }
    setHashtagLoading(false);
  };

  const copyAllHashtags = () => {
    if (hashtagsResult) {
      navigator.clipboard.writeText(hashtagsResult.trim());
    }
  };

  const generate = async () => {
    if (output) setPreviousOutput(output);
    setIsGenerating(true);
    setError("");
    setOutput("");

    let system = "";
    let userMessage = "";

    try {
      switch (activeModule) {
        case "promo":
          system = buildPromoSystem(promoData, dialectRules);
          // Inject saved synopsis analysis if available
          if (savedSynopsis?.analysis) {
            system += `\n\n=== STORY SYNOPSIS ANALYSIS (USE THIS AS PRIMARY STORY CONTEXT) ===
You have been provided with a detailed story analysis. Use this as your PRIMARY source of story knowledge for writing VOs.
Extract characters, plot points, emotional hooks, mystery elements, and relationships from this analysis.
DO NOT make up story details — use ONLY what is provided here.

${savedSynopsis.analysis}
=== END SYNOPSIS ===`;
          }
          userMessage = `Movie: "${promoData.movieName || "Untitled"}"
Star Cast: ${promoData.starCast || "N/A"}
Genre: ${promoData.genre}
Language: ${promoData.language}
Platform: ${promoData.platform}
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

        case "synopsis": {
          if (!synopsisData.storyText.trim()) {
            setError("Story paste karo ya document link se fetch karo.");
            setIsGenerating(false);
            return;
          }
          system = buildSynopsisSystem();
          userMessage = `Movie/Show: ${synopsisData.movieName || "Not specified"}

=== STORY/SYNOPSIS ===
${synopsisData.storyText}`;
          break;
        }

        case "caption":
          system = buildCaptionSystem(captionData, dialectRules);
          userMessage = `Movie/Show: ${captionData.movieName || "Content"}
Platform: ${captionData.platform}
Language: ${captionData.language}
Mood: ${captionData.mood}
Count: ${captionData.count}${captionData.scriptInput ? `\n\n=== REFERENCE SCRIPTS (match this style) ===\n${captionData.scriptInput}` : ""}`;
          break;

        case "headline":
          system = buildHeadlineSystem(headlineData, dialectRules);
          userMessage = `Movie/Show: ${headlineData.movieName || "Content"}
Platform: ${headlineData.platform}
Language: ${headlineData.language}
Tone: ${headlineData.tone}
Count: ${headlineData.count}${headlineData.scriptInput ? `\n\n=== REFERENCE SCRIPTS (match this style) ===\n${headlineData.scriptInput}` : ""}`;
          break;

        case "learning": {
          if (!learningData.personaName || !learningData.scriptInput) {
            setError("Persona name aur scripts dono zaroori hain.");
            setIsGenerating(false);
            return;
          }
          system = buildLearningSystem(learningData.personaName, learningData.styleDescription);
          userMessage = `PERSONA: ${learningData.personaName}
USER-DESCRIBED STYLE: ${learningData.styleDescription || "Not specified"}
USER-DESCRIBED VOCABULARY: ${learningData.vocabularyPrefs || "Not specified"}
USER-DESCRIBED TONE: ${learningData.tonePatterns || "Not specified"}

=== SCRIPTS TO ANALYZE ===
${learningData.scriptInput}`;
          break;
        }

        default:
          break;
      }

      // Inject persona if selected (not for learning module)
      const activePersonaId = activePersonaMap[activeModule];
      if (activePersonaId && activeModule !== "learning") {
        const persona = personas.find(p => p.id === activePersonaId);
        if (persona?.styleFingerprint) {
          system = `=== ACTIVE WRITING PERSONA: ${persona.name} ===
CRITICAL DIRECTIVE: You MUST write in the exact style of "${persona.name}".
This persona's writing fingerprint takes HIGHEST PRIORITY for all tone, vocabulary, sentence structure, and emotional register decisions.

STYLE FINGERPRINT:
${persona.styleFingerprint}
${persona.styleDescription ? `\nSTYLE NOTES: ${persona.styleDescription}` : ""}
${persona.vocabularyPrefs ? `VOCABULARY MUST-USE: ${persona.vocabularyPrefs}` : ""}
${persona.tonePatterns ? `TONE PATTERN: ${persona.tonePatterns}` : ""}

INTEGRATION RULES:
- Apply this persona's vocabulary choices to every line of output
- Match this persona's sentence rhythm and length patterns
- Use this persona's hook style for openings
- Use this persona's CTA patterns for closings
- Maintain this persona's emotional register throughout
- If the persona uses specific dialect markers, ALWAYS use them
=== END PERSONA ===

${system}`;
        }
      }

      const result = await streamConvert({
        model: "anthropic/claude-sonnet-4-5",
        system,
        messages: [{ role: "user", content: userMessage }],
        onChunk: (partial) => setOutput(partial),
      });

      // Generate variant B if A/B mode is on
      if (abMode && activeModule !== "learning") {
        setVariantB("");
        await streamConvert({
          model: "anthropic/claude-sonnet-4-5",
          system: system + "\n\nIMPORTANT: Generate a COMPLETELY DIFFERENT version from your previous output. Use a different angle, tone variation, structure, and creative approach. Make it distinctly unique while maintaining quality.",
          messages: [{ role: "user", content: userMessage }],
          onChunk: (partial) => setVariantB(partial),
        });
      }

      // Save persona after learning analysis completes
      if (activeModule === "learning" && result) {
        const newPersona = {
          id: crypto.randomUUID(),
          name: learningData.personaName,
          createdAt: new Date().toISOString(),
          styleDescription: learningData.styleDescription,
          vocabularyPrefs: learningData.vocabularyPrefs,
          tonePatterns: learningData.tonePatterns,
          styleFingerprint: result,
          sourceScriptCount: learningData.scriptInput.split("---").length,
          sourceSamplePreview: learningData.scriptInput.slice(0, 200),
        };
        const updated = [...personas, newPersona];
        setPersonas(updated);
        savePersonas(updated);
        setLearningData({ personaName: "", styleDescription: "", vocabularyPrefs: "", tonePatterns: "", scriptInput: "", googleLink: "" });
      }

      // Save synopsis analysis for use in promo writing
      if (activeModule === "synopsis" && result) {
        const synopsisResult = {
          movieName: synopsisData.movieName || "Untitled",
          analysis: result,
          rawStory: synopsisData.storyText.slice(0, 500),
          savedAt: new Date().toISOString(),
        };
        setSavedSynopsis(synopsisResult);
        localStorage.setItem("stage_story_synopsis", JSON.stringify(synopsisResult));
      }
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
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "16px 22px 60px", position: "relative", zIndex: 1 }}>

      {/* Module Tabs */}
      <div className="clay" style={{ padding: 0, marginBottom: "20px", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {MODULES.map(m => {
            const active = activeModule === m.id;
            return (
              <button key={m.id} onClick={() => { setActiveModule(m.id); setOutput(""); setError(""); setPreviousOutput(""); }} className="clay-btn" style={{
                padding: "10px 16px", fontSize: "12px", fontWeight: active ? 800 : 600,
                color: active ? "#d97706" : (dm ? "#b0a090" : "#6b5e50"),
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
              {savedSynopsis && (
                <div className="clay-inner" style={{ padding: "8px 12px", borderLeft: "3px solid #22c55e", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#22c55e" }}>📖 Story Synopsis Active:</span>
                  <span style={{ fontSize: "10px", color: dm ? "#b0a090" : "#6b5e50", marginLeft: "6px" }}>{savedSynopsis.movieName} — story context auto-inject ho raha hai</span>
                </div>
              )}
              <PersonaSelector moduleId="promo" personas={personas} activePersonaMap={activePersonaMap} onSelect={handlePersonaSelect} darkMode={dm} />
              <StudioInput label="Movie/Show Name *" value={promoData.movieName} onChange={v => setPromoData({ ...promoData, movieName: v })} placeholder="" darkMode={dm} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Language" value={promoData.language} onChange={v => setPromoData({ ...promoData, language: v })} options={LANGUAGES} darkMode={dm} />
                <StudioSelect label="Genre" value={promoData.genre} onChange={v => setPromoData({ ...promoData, genre: v })} options={GENRES} darkMode={dm} />
              </div>
              <StudioSelect label="Platform" value={promoData.platform} onChange={v => setPromoData({ ...promoData, platform: v })} options={[
                { value: "instagram", label: "Instagram" }, { value: "youtube", label: "YouTube" },
                { value: "facebook", label: "Facebook" }, { value: "whatsapp", label: "WhatsApp" }
              ]} darkMode={dm} />
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
              <PersonaSelector moduleId="campaign" personas={personas} activePersonaMap={activePersonaMap} onSelect={handlePersonaSelect} darkMode={dm} />
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

            {/* STORY SYNOPSIS */}
            {activeModule === "synopsis" && (<>
              <StudioInput label="Movie/Show Name" value={synopsisData.movieName} onChange={v => setSynopsisData({ ...synopsisData, movieName: v })} placeholder="" darkMode={dm} />
              <StudioTextArea label="Paste Story / Synopsis *" value={synopsisData.storyText} onChange={v => setSynopsisData({ ...synopsisData, storyText: v })} placeholder="Yahan apni story ya synopsis paste karein..." rows={8} darkMode={dm} />
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Or Upload Text File</label>
                <input type="file" accept=".txt,.csv,.doc,.docx" multiple onChange={handleSynopsisFileUpload} style={{ fontSize: "11px", color: dm ? "#b0a090" : "#6b5e50" }} />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <StudioInput label="Or Paste Document Link (Google Docs / Drive)" value={synopsisData.googleLink} onChange={v => setSynopsisData({ ...synopsisData, googleLink: v })} placeholder="https://docs.google.com/document/d/..." darkMode={dm} />
                </div>
                {synopsisData.googleLink && (
                  <button onClick={fetchSynopsisDocLink} disabled={synopsisFetchingDoc} className="clay-btn" style={{ padding: "8px 14px", fontSize: "11px", fontWeight: 700, color: dm ? "#d4c8b0" : "#78350f", whiteSpace: "nowrap", opacity: synopsisFetchingDoc ? 0.6 : 1 }}>
                    {synopsisFetchingDoc ? "Fetching..." : "Fetch"}
                  </button>
                )}
              </div>
              {synopsisData.googleLink && (
                <div className="clay-inner" style={{ padding: "8px 12px", fontSize: "10px", color: dm ? "#b0a090" : "#6b5e50", lineHeight: 1.6 }}>
                  Tip: Document publicly shared hona chahiye ("Anyone with the link").
                </div>
              )}
              {savedSynopsis && (
                <div className="clay-inner" style={{ padding: "10px 12px", borderLeft: "3px solid #f59e0b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: dm ? "#e8e0d4" : "#3d3425" }}>✅ Saved: {savedSynopsis.movieName}</span>
                    <button onClick={() => { setSavedSynopsis(null); localStorage.removeItem("stage_story_synopsis"); }} className="clay-btn" style={{ padding: "3px 8px", fontSize: "10px", fontWeight: 700, color: "#dc2626" }}>
                      Clear
                    </button>
                  </div>
                  <span style={{ fontSize: "10px", color: dm ? "#807060" : "#a08060" }}>Ye analysis Promo Writer me auto-inject hogi. Saved: {new Date(savedSynopsis.savedAt).toLocaleDateString()}</span>
                </div>
              )}
            </>)}

            {/* CAPTIONS */}
            {activeModule === "caption" && (<>
              <PersonaSelector moduleId="caption" personas={personas} activePersonaMap={activePersonaMap} onSelect={handlePersonaSelect} darkMode={dm} />
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
              <div style={{ borderTop: `1px solid ${dm ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.15)"}`, paddingTop: "12px", marginTop: "4px" }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Style Learning (Optional)</label>
                <StudioInput label="Style Description" value={captionData.styleDescription} onChange={v => setCaptionData({ ...captionData, styleDescription: v })} placeholder="" darkMode={dm} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                  <StudioInput label="Vocabulary Preferences" value={captionData.vocabularyPrefs} onChange={v => setCaptionData({ ...captionData, vocabularyPrefs: v })} placeholder="" darkMode={dm} />
                  <StudioInput label="Tone Patterns" value={captionData.tonePatterns} onChange={v => setCaptionData({ ...captionData, tonePatterns: v })} placeholder="" darkMode={dm} />
                </div>
                <div style={{ marginTop: "10px" }}>
                  <StudioTextArea label="Paste Sample Scripts" value={captionData.scriptInput} onChange={v => setCaptionData({ ...captionData, scriptInput: v })} placeholder="" rows={4} darkMode={dm} />
                </div>
              </div>
            </>)}

            {/* HEADLINE */}
            {activeModule === "headline" && (<>
              <PersonaSelector moduleId="headline" personas={personas} activePersonaMap={activePersonaMap} onSelect={handlePersonaSelect} darkMode={dm} />
              <StudioInput label="Movie/Show Name" value={headlineData.movieName} onChange={v => setHeadlineData({ ...headlineData, movieName: v })} placeholder="" darkMode={dm} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Platform" value={headlineData.platform} onChange={v => setHeadlineData({ ...headlineData, platform: v })} options={[
                  { value: "instagram", label: "Instagram" }, { value: "facebook", label: "Facebook" },
                  { value: "youtube", label: "YouTube" }, { value: "twitter", label: "Twitter" },
                  { value: "push", label: "Push Notification" }, { value: "email", label: "Email" }
                ]} darkMode={dm} />
                <StudioSelect label="Language" value={headlineData.language} onChange={v => setHeadlineData({ ...headlineData, language: v })} options={LANGUAGES} darkMode={dm} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Tone" value={headlineData.tone} onChange={v => setHeadlineData({ ...headlineData, tone: v })} options={[
                  { value: "catchy", label: "Catchy" }, { value: "dramatic", label: "Dramatic" },
                  { value: "funny", label: "Funny" }, { value: "urgent", label: "Urgent" },
                  { value: "emotional", label: "Emotional" }
                ]} darkMode={dm} />
                <StudioSelect label="Count" value={headlineData.count} onChange={v => setHeadlineData({ ...headlineData, count: v })} options={[
                  { value: "5", label: "5 Headlines" }, { value: "10", label: "10 Headlines" },
                  { value: "15", label: "15 Headlines" }
                ]} darkMode={dm} />
              </div>
              <div style={{ borderTop: `1px solid ${dm ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.15)"}`, paddingTop: "12px", marginTop: "4px" }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Style Learning (Optional)</label>
                <StudioInput label="Style Description" value={headlineData.styleDescription} onChange={v => setHeadlineData({ ...headlineData, styleDescription: v })} placeholder="" darkMode={dm} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                  <StudioInput label="Vocabulary Preferences" value={headlineData.vocabularyPrefs} onChange={v => setHeadlineData({ ...headlineData, vocabularyPrefs: v })} placeholder="" darkMode={dm} />
                  <StudioInput label="Tone Patterns" value={headlineData.tonePatterns} onChange={v => setHeadlineData({ ...headlineData, tonePatterns: v })} placeholder="" darkMode={dm} />
                </div>
                <div style={{ marginTop: "10px" }}>
                  <StudioTextArea label="Paste Sample Scripts" value={headlineData.scriptInput} onChange={v => setHeadlineData({ ...headlineData, scriptInput: v })} placeholder="" rows={4} darkMode={dm} />
                </div>
              </div>
            </>)}

            {/* LEARNING */}
            {activeModule === "learning" && (<>
              <StudioInput label="Persona Name *" value={learningData.personaName} onChange={v => setLearningData({ ...learningData, personaName: v })} placeholder="" darkMode={dm} />
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Or Upload Text Files</label>
                <input type="file" accept=".txt,.csv,.doc,.docx" multiple onChange={handleFileUpload} style={{ fontSize: "11px", color: dm ? "#b0a090" : "#6b5e50" }} />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <StudioInput label="Paste Document Link (Google Docs / Sheets / Drive)" value={learningData.googleLink} onChange={v => setLearningData({ ...learningData, googleLink: v })} placeholder="https://docs.google.com/document/d/..." darkMode={dm} />
                </div>
                {learningData.googleLink && (
                  <button onClick={fetchDocumentLink} disabled={fetchingDoc} className="clay-btn" style={{ padding: "8px 14px", fontSize: "11px", fontWeight: 700, color: dm ? "#d4c8b0" : "#78350f", whiteSpace: "nowrap", opacity: fetchingDoc ? 0.6 : 1 }}>
                    {fetchingDoc ? "Fetching..." : "Fetch"}
                  </button>
                )}
              </div>
              {learningData.googleLink && (
                <div className="clay-inner" style={{ padding: "8px 12px", fontSize: "10px", color: dm ? "#b0a090" : "#6b5e50", lineHeight: 1.6 }}>
                  Tip: Document publicly shared hona chahiye ("Anyone with the link"). Google Docs, Sheets, aur Drive links supported hain.
                </div>
              )}
              {personas.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Saved Personas ({personas.length})</label>
                  {personas.map(p => (
                    <div key={p.id} className="clay-inner" style={{ padding: "8px 12px", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: dm ? "#e8e0d4" : "#3d3425" }}>{p.name}</span>
                        <span style={{ fontSize: "10px", color: dm ? "#807060" : "#a08060", marginLeft: "8px" }}>{p.sourceScriptCount} scripts</span>
                      </div>
                      <button onClick={() => deletePersona(p.id)} className="clay-btn" style={{ padding: "3px 8px", fontSize: "10px", fontWeight: 700, color: "#dc2626" }}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>)}

            {/* A/B Variant Toggle */}
            {activeModule !== "learning" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0" }}>
                <div onClick={() => { setAbMode(a => !a); setVariantB(""); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "36px", height: "20px", borderRadius: "10px", position: "relative", transition: "background 0.2s",
                    background: abMode ? "linear-gradient(135deg, #f59e0b, #d97706)" : (dm ? "#333" : "#d5cdc1"),
                  }}>
                    <div style={{
                      width: "16px", height: "16px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px",
                      left: abMode ? "18px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }} />
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: abMode ? "#d97706" : (dm ? "#b0a090" : "#6b5e50") }}>A/B Variants</span>
                </div>
                {abMode && <span style={{ fontSize: "10px", color: dm ? "#807060" : "#a08060" }}>Generates 2 unique versions</span>}
              </div>
            )}

            {/* Generate Button */}
            <button onClick={generate} disabled={isGenerating} className="clay-btn-primary" style={{
              width: "100%", padding: "13px", borderRadius: "14px", border: "none",
              cursor: isGenerating ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "4px"
            }}>
              {isGenerating ? (
                <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> {activeModule === "learning" || activeModule === "synopsis" ? "Analyzing..." : "Generating..."}</>
              ) : (
                <>{activeModule === "learning" ? "Analyze & Learn" : activeModule === "synopsis" ? "Analyze Story" : `Generate ${MODULES.find(m => m.id === activeModule)?.label}`}</>
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
              {(() => {
                const activeId = activePersonaMap[activeModule];
                const persona = activeId ? personas.find(p => p.id === activeId) : null;
                if (!persona) return null;
                return (
                  <span style={{
                    fontSize: "9px", fontWeight: 700, padding: "3px 8px", borderRadius: "8px",
                    background: dm ? "rgba(217,119,6,0.15)" : "rgba(245,158,11,0.12)",
                    color: "#d97706",
                  }}>
                    {"\uD83C\uDFAD"} {persona.name}
                  </span>
                );
              })()}
            </h3>
            {output && !isGenerating && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {previousOutput && previousOutput !== output && (
                  <button onClick={handleUndo} className="clay-btn" style={{
                    padding: "4px 10px", fontSize: "10px", fontWeight: 700,
                    color: dm ? "#d4c8b0" : "#78350f",
                    display: "flex", alignItems: "center", gap: "4px"
                  }}>
                    {"\u21A9"} Undo
                  </button>
                )}
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: dm ? "#807060" : "#a08060", fontSize: "13px", fontWeight: 600, textAlign: "center" }}>
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

          {/* Tone Meter */}
          {output && !isGenerating && (
            <div style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", textTransform: "uppercase", letterSpacing: "0.8px" }}>Tone Meter</span>
                <span style={{
                  fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "8px",
                  background: toneMeterValue > 75 ? "rgba(239,68,68,0.15)" : toneMeterValue > 40 ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)",
                  color: toneMeterValue > 75 ? "#ef4444" : toneMeterValue > 40 ? "#d97706" : "#3b82f6",
                }}>{toneMeterLabel}</span>
              </div>
              <div style={{
                height: "8px", borderRadius: "4px", overflow: "hidden", position: "relative",
                background: dm ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.15)",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, height: "100%", borderRadius: "4px",
                  width: `${toneMeterValue}%`, transition: "width 0.6s ease, background 0.6s ease",
                  background: toneMeterValue > 75
                    ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                    : toneMeterValue > 40
                      ? "linear-gradient(90deg, #3b82f6, #f59e0b)"
                      : "linear-gradient(90deg, #3b82f6, #60a5fa)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span style={{ fontSize: "9px", color: "#3b82f6", fontWeight: 600 }}>Neutral</span>
                <span style={{ fontSize: "9px", color: "#f59e0b", fontWeight: 600 }}>Warm</span>
                <span style={{ fontSize: "9px", color: "#ef4444", fontWeight: 600 }}>Dramatic</span>
              </div>
            </div>
          )}

          {/* Hashtag Generator */}
          {output && !isGenerating && activeModule !== "learning" && (
            <div style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", textTransform: "uppercase", letterSpacing: "0.8px" }}>Hashtags</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {HASHTAG_PLATFORMS.map(p => (
                    <button key={p.value} onClick={() => setHashtagPlatform(p.value)} className="clay-btn" style={{
                      padding: "3px 10px", fontSize: "10px", fontWeight: hashtagPlatform === p.value ? 800 : 600,
                      color: hashtagPlatform === p.value ? "#d97706" : (dm ? "#b0a090" : "#6b5e50"),
                      background: hashtagPlatform === p.value
                        ? (dm ? "rgba(217,119,6,0.15)" : "rgba(245,158,11,0.12)")
                        : undefined,
                      border: hashtagPlatform === p.value ? "1px solid rgba(245,158,11,0.3)" : undefined,
                    }}>{p.label}</button>
                  ))}
                </div>
                <button onClick={generateHashtags} disabled={hashtagLoading} className="clay-btn" style={{
                  padding: "5px 14px", fontSize: "10px", fontWeight: 800, marginLeft: "auto",
                  color: hashtagLoading ? (dm ? "#807060" : "#a08060") : "#d97706",
                  cursor: hashtagLoading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "4px",
                }}>
                  {hashtagLoading ? (
                    <><span style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2px solid rgba(217,119,6,0.3)", borderTopColor: "#d97706", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Generating...</>
                  ) : (
                    <># Generate</>
                  )}
                </button>
              </div>

              {hashtagsResult && (
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                    {hashtagsResult.trim().split(/\s+/).filter(h => h.startsWith("#")).map((tag, i) => (
                      <span key={i} onClick={() => navigator.clipboard.writeText(tag)} style={{
                        display: "inline-block", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 600,
                        cursor: "pointer", transition: "all 0.15s",
                        background: dm ? "rgba(217,119,6,0.12)" : "rgba(245,158,11,0.1)",
                        color: dm ? "#f59e0b" : "#92400e",
                        border: `1px solid ${dm ? "rgba(217,119,6,0.2)" : "rgba(245,158,11,0.2)"}`,
                      }} title="Click to copy">{tag}</span>
                    ))}
                  </div>
                  <button onClick={copyAllHashtags} className="clay-btn" style={{
                    padding: "4px 12px", fontSize: "10px", fontWeight: 700,
                    color: dm ? "#d4c8b0" : "#78350f", display: "flex", alignItems: "center", gap: "4px",
                  }}>
                    {"\uD83D\uDCCB"} Copy All Hashtags
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* A/B Variant B Output */}
      {abMode && variantB && (
        <div className="clay" style={{ padding: "18px", marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 800, color: dm ? "#d4c8b0" : "#78350f", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "8px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontWeight: 800 }}>B</span> Variant B
            </h3>
            <CopyBtn text={variantB} darkMode={dm} />
          </div>
          <div className="clay-inner" style={{
            minHeight: "200px", maxHeight: "400px", overflowY: "auto",
            padding: "16px", fontSize: "13px", lineHeight: 1.9,
            color: dm ? "#e8e0d4" : "#3d3425", whiteSpace: "pre-wrap"
          }}>
            {variantB}
          </div>
        </div>
      )}

      {/* Responsive override for mobile */}
      <style>{`
        @media(max-width:700px){
          .studio-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
