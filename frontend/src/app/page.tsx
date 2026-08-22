'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/shared/components/Button';

import logo from '../assets/logo.png';
import logoLight from '../assets/logo-light-mode.png';
/* Decorative line-art marks for the "how it works" steps — monochrome,
   colored via currentColor from .how-row-icon so they follow the theme. */
const SatelliteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" viewBox="0 0 191 178"><path d="M22.7 21.5C13.8 30.9 10 35.6 10.2 36.9 10.5 38.8 51 78 52.7 78c.4 0 3.5-2.9 6.8-6.6l6-6.6 3.2 2.9 3.1 2.8-2.4 2.9c-2.4 2.7-2.6 2.7-4.4 1.1-2.4-2.2-5.9-1.3-4 1 .7.8 1.9 1.5 2.6 1.5 2.1 0 1.8.8-2.1 5.3q-5.7 6.5-2 12c1.3 2.1 1.2 2.5-2.3 6.6l-3.7 4.3-6-1.1c-8.2-1.5-18.1.5-22.7 4.6-4.3 3.8-.6 18.4 6.7 27.1l2.8 3.3-2.9 3c-1.5 1.6-3.7 2.9-4.9 2.9-3.2 0-6.5 2.8-6.5 5.6 0 2.9 3.2 6.4 6 6.4 3 0 6.3-3.8 5.7-6.6q-.4-2.3 1.7-4.2c3.7-3.3 4.5-3.4 7.9-.8 8.8 6.7 22.4 10.3 27.1 7.2s6.7-15.3 4.4-27.7c-.2-.9 1.6-3.1 4.3-5.1 4.4-3.4 4.7-3.5 7.1-2 3.4 2.1 6.5 1.1 12.2-3.9 3.8-3.4 5-3.9 5.7-2.8 1.1 1.8 1.1 2.6-.1 3.4-.5.3-1 1.9-1 3.5 0 2.4 3.7 6.4 25.2 26.9a299 299 0 0 0 26.7 24.1 158 158 0 0 0 28.1-28.5q-.2-2-24.2-25c-30.9-29.3-28.2-27.3-31.8-24.6q-4.9 3.5-5 1c0-.7 4.7-6 10.4-11.9 10-10.3 10.4-10.9 11-16.2.4-3.2.3-6.6-.4-8.3-2.9-7.8-16-18.9-23.4-20-8.3-1.3-10.2-.3-22.8 12.6A282 282 0 0 1 82.7 60c-1.2 0-1.5-3.3-.5-5q1.3-1.9.3-4.4A414 414 0 0 0 37.6 8.2C36 8 32.2 11.4 22.7 21.5m25.2.6c.1.3-2.1 3-4.8 6l-4.9 5.4-5.6-5.5-5.6-5.4 5.2-5.3 5.2-5.2 5.2 4.7a58 58 0 0 1 5.3 5.3M61 36.9c-.5.9-2.7 3.4-4.9 5.6L52 46.4 46.5 41 41 35.6l5.2-5.3 5.2-5.3 5.3 5.2c3.9 3.9 5 5.5 4.3 6.7M30.5 31l4.9 5-5.4 5.5-5.4 5.5-5.3-5.2-5.3-5.2 5.2-5.3A46 46 0 0 1 25 26c.3 0 2.8 2.3 5.5 5m18.4 17.7c.6.4-9.3 11.1-10.1 10.9-.3 0-2.9-2.3-5.8-5l-5.2-4.9 5.3-5.3 5.3-5.4 5 4.8zm22.3-5 4.7 4.8-5 5.2a66 66 0 0 1-5.4 5.3c-.2 0-2.7-2.3-5.5-5.1l-5.2-5.2 4.8-4.8a24 24 0 0 1 5.9-4.9c.6 0 3.2 2.1 5.7 4.7m49.6-3.2a51 51 0 0 1 15.8 14.7c1.6 3.1 1.9 7.1.5 6.6a101 101 0 0 1-22.5-21.6c-1-1.7 1.6-1.6 6.2.3m-9.8.3c0 2.9 15.7 18.8 23.9 24.2l2.3 1.6-2.7 3.2c-1.5 1.8-3 3.2-3.5 3.2-1.4 0-17.4-14.6-22.9-20.9l-5.4-6.2 2.8-2.9c2.7-2.9 5.5-3.9 5.5-2.2m-.2 19c5.9 6 12.2 12.1 14.1 13.6l3.4 2.7-14.9 15.3a351 351 0 0 1-15.6 15.5c-.4 0-7.1-6.1-14.8-13.6L68.9 79.6l15.3-15.3C92.6 55.9 99.6 49 99.8 49zm-53.2-2.7 5.3 5.2-4.7 5.3c-2.5 3-4.8 5.4-5.1 5.4-.3-.1-3-2.3-6-4.9l-5.4-4.9 4.9-5.6A41 41 0 0 1 52 52c.2 0 2.8 2.3 5.6 5.1M79 53c0 .5-.5 2.1-1.2 3.5-.9 2.1-.9 3.1.1 4.7 1.1 1.8 1 2.4-1.1 4.4l-2.3 2.3-3.3-2.7-3.2-2.7 4.6-5.3Q79 49.8 79 53m12.7 59.5c-1.5 1.4-3.4 2.5-4.1 2.5-2.1 0-24.5-21.9-25.2-24.5q-.6-2.4 1.7-5.5l2.3-3.1L80.5 96l14 14.1zm41.4-7.6c-1.6 2-3.8 4.5-5 5.5-2.1 1.9-2.2 1.9-6.1-1.9-2.2-2.2-4-4.4-4-4.9a22 22 0 0 1 4.7-5.8l4.7-4.8 4.3 4.2 4.2 4.1zm-14.4-9.4c1.1 3.1-5.4 7.4-7.1 4.7-.6-1 4-6.2 5.5-6.2q.9.2 1.6 1.5m-46.9 10.8 7.3 7.4-3.5 2.6a20 20 0 0 1-4 2.7 62 62 0 0 1-7.1-6.5l-6.5-6.6 2.7-3.4A19 19 0 0 1 64 99a83 83 0 0 1 7.8 7.3m37.7.7c-3.2 3.4-4.3 3.7-5.2 1.4-.3-.9.6-2.7 2.3-4.5 2.5-2.6 3-2.8 4.3-1.4s1.2 1.8-1.4 4.5m35 13-5.5 5.5-5.2-5.3-5.3-5.2 5.5-5.5 5.4-5.5 5.3 5.2 5.3 5.3zm-91-10.6q8.5 3.6 13.1 11.8c2.6 4.8 2.9 6.2 2.9 14.5 0 5-.4 9.5-.8 10s-2-.6-3.4-2.2A360 360 0 0 0 31 110c0-1.5 7.6-2.9 13.2-2.5 3.2.3 7.4 1.1 9.3 1.9m67 2.7 2.6 3.2-5.2 5.3-5.2 5.3-3.8-3.2c-2-1.8-3.8-3.9-3.8-4.7-.1-.8 2-3.6 4.6-6.2 5.2-5.2 6.1-5.2 10.8.3m-85.1 6.8a263 263 0 0 1 28.7 29.2c2.4 4.5-10.4 1.1-19.8-5.2-3.9-2.7-5-3.8-4.3-4.9q2.4-3.6-1.4-2.6c-2.1.5-2.9-.1-5.3-3.6-5-7.5-8.8-18.8-6.3-18.8a47 47 0 0 1 8.4 5.9m96.4 4.4 5.2 5.3-5.5 5.4-5.5 5.4-5.5-5.4-5.5-5.4 5.2-5.3a46 46 0 0 1 5.8-5.3 46 46 0 0 1 5.8 5.3m27-.5 5.2 4.7-5.5 5.5-5.5 5.5-5.2-5.3-5.3-5.2 5-5c2.7-2.7 5.2-5 5.5-5 .3.1 2.9 2.2 5.8 4.8m13.2 23c-5.7 6-6 5.9-12.5-.7l-3.9-4.1 5.4-5.5 5.5-5.5 5.3 5.3 5.2 5.3zm-26.8.8c-2.6 2.8-5 5.1-5.4 5-.3 0-2.9-2.3-5.8-5l-5.2-4.9 5.3-5.3 5.3-5.4 5.3 5.2 5.2 5.2zm13.6 2.7 5.2 5.3-5.5 5.4-5.5 5.5-5.2-5.2-5.1-5.1 4.9-5.6a44 44 0 0 1 5.4-5.5c.3-.1 2.9 2.3 5.8 5.2m-130.8.3c1.1 1.2 1 1.8-.3 3.2-1.6 1.5-1.8 1.5-3.4 0-1.3-1.4-1.4-2-.3-3.2q1.2-1.5 2-1.6.8.1 2 1.6"></path></svg>
);

const InvestigateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" viewBox="0 0 191 233"><path d="M86.1 13.1c-1.3.5-3.5 1.8-5 2.8s-5 2-8.3 2.3q-12 1-15.4 10.6c-1.3 3.6-2.5 5.2-4.5 5.9-3.7 1.4-6.3 5.8-6.4 10.7 0 2.2-.8 5.5-1.8 7.3-2.3 4.2-2.2 8.4.3 11.6 1.1 1.4 2 3.8 2 5.4s.6 3.7 1.4 4.8 1.6 4.4 1.8 7.4c.5 4.7 1.1 6 4.2 8.8Q58 94 61 94c2.4 0 3.3.7 4.9 3.9 1.1 2.1 3.2 5.2 4.6 6.9 1.9 2.3 2.5 4 2.3 6.3-.3 3.1-.5 3.3-7.6 4.9a69 69 0 0 0-26.8 13.4 107 107 0 0 0-25.5 42.9c-4 11.8-3.8 20.4.7 28.8 2.9 5.5 17 20.9 19.1 20.9.6 0 2.3-2 3.7-4.4 2.3-3.9 9.7-10.6 11.8-10.6.4 0 .8 3 1 6.7.2 4.1.7 6.6 1.3 6.3s1-10 1-26c0-22.7.2-25.8 1.8-28 1.8-2.6 2.3-6 .8-6-.9 0-16.1 25.9-16.1 27.4 0 .5 2.1 4.5 4.7 8.9 2.8 4.9 4.3 8.2 3.6 8.4-3 1-9.6 6.8-11.5 9.9-1.1 1.8-2.4 3.4-2.8 3.4a76 76 0 0 1-15.4-17.9c-4.2-7.9-4.5-14.8-1.1-25.8a104 104 0 0 1 26.4-43.8 67 67 0 0 1 21.3-11l5.6-1.8 4.9 5a25 25 0 0 0 21.4 8.1c6.6-.5 10.2-2.5 13.4-7.6 1.1-1.7 2.5-3.1 3.1-3.2 3.1-.1 11.9 3.5 17 6.9 6.1 4.1 14.1 13.5 12.4 14.6s-1.2 5.3 1.5 17.6c3.7 16.9 5.3 21.9 7 21.9s1.8.4 0-5.6c-1.6-5.5-6.5-27.7-6.5-29.6q-.2-1.3 4.9-1c5.7.4 12.4-2.6 14.5-6.6 1.2-2.2 1.5-1.9 5.3 6.5 11.4 24.8 13.3 40.2 5.8 47.7-7.9 7.9-20 4.2-31.6-9.7l-4.9-5.9v-8.9c0-7.2-.3-8.9-1.5-8.9-1.3 0-1.5 4.1-1.5 31.1 0 24.4.3 31 1.3 30.7s1.3-5.3 1.5-19.1c.1-10.3.4-18.7.7-18.7s2.7 2.4 5.4 5.3c5.3 5.7 12.3 10 18 11.2 8 1.7 18.2-5 19.7-13a62 62 0 0 0-3.1-26c-3.9-11.6-11-26.2-13.4-27.7-1.8-1.1-2.1-2.3-2.1-7.8q-.1-20.1-11.6-25.2c-2.5-1.1-5.2-1.7-6-1.4q-1.5.4-2.9-2.4c-1.5-3-1.5-3.1 2-6.7 9.2-9.5 7.9-24.9-2.9-33.9-4.3-3.6-4.5-3.9-3.9-7.9.6-4.7-1.2-9.1-4.9-12.2-1.3-1-3-3.8-3.8-6.2a15 15 0 0 0-14.4-10.5c-4.1-.1-6-.6-7.8-2.3a20 20 0 0 0-5.1-3.2 28 28 0 0 0-14.6 0m31.8 30.5q3.3.7 4.2 3.1c1.2 3.3 1.4 3.1-3 4.3A27 27 0 0 0 104 65.2a23.4 23.4 0 0 0 14 30.9c2.2.7 4 1.8 4 2.4 0 2.2-5.9 9.4-9.9 12.1a21 21 0 0 1-10 3.1q-6.2.6-6.1 1.9 0 1.4 4.5 1.4c3.8 0 4.5.3 4.3 1.7q-.4 1.9 1.7 1.5c1.8-.4 1.8-.2-.5 2.3-5.8 6.3-14.9 7.4-23.8 2.9-5.8-2.9-9.7-7-8.3-8.8.4-.6 1.1-3.2 1.3-5.7.5-4.2.2-5.1-2.8-8.9a31 31 0 0 1-4.4-7.6c-1-3-1.6-3.4-4.6-3.4-4.6 0-7-1.4-8.9-5-2.4-4.7-2-10.5 1.1-12.9 2.8-2.2 4.7-1.9 8.2 1.3l2.4 2.1 1.8-2.3c2-2.4 4-10.3 4-15.5 0-2.9.5-3.4 5-5.5 3.6-1.7 5.6-3.4 7.2-6.3 1.8-3.2 2.7-3.8 4.3-3.3 7.4 2.4 14.5 1.2 18.5-3.1l2.4-2.5 2.6 2.5a14 14 0 0 0 5.9 3.1m16.7 11.3a25 25 0 0 1 7.2 5.6c11.1 13.5 1.5 34-15.8 33.9a20 20 0 0 1-20-15.1c-4.9-16.3 12.9-31.5 28.6-24.4m-3 45c.9 2.1.8 3.4-.3 5.5-1 1.9-1.1 3.1-.3 4.5.5 1.1 1 3 1 4.2a34 34 0 0 0 3.1 11.1c1.5 3 1 2.9-4.2-.7a52 52 0 0 0-12.3-5.6l-8.6-2.6q-1.6-.4 1.5-2c4.7-2.4 9.4-7.3 12.1-12.6 2.9-5.7 6.3-6.5 8-1.8m19.8 3.6c4.5 3 6.9 9.6 7.6 21.9q.8 11.2-.4 12.5c-1.3 1.7-8.4 5-10.7 5.1-.9 0-3.3-2.5-5.3-5.5s-3.2-5.5-2.7-5.5 1.8 1.3 2.8 3q1.6 3.1 4.5 3c3.4 0 4.1-1.1 3.2-5.6l-.7-3.6-4.7.7c-8.1 1.1-7.5-4.1.6-5.4 2.1-.3 3.9-1.2 4.2-1.9.5-1.7-5.6-1.5-8.8.3-3.4 1.9-4 1.8-4-.4 0-2.6 3.5-5 8.3-5.8 2-.3 3.7-.9 3.7-1.4 0-1.5-6.3-1-9.4.6-3.9 2.1-6.1 1.3-4.6-1.6 1.3-2.4 6.7-4.9 10.5-4.9 2.8 0 3.4-1.7.8-2.7q-2-.9-11.5 3.2c-3 1.2-2.2-3.1 1-5.3a14 14 0 0 1 15.6-.7M48.7 199.4c-.2.5-1.9-1.9-3.9-5.5l-3.6-6.4 3.1-5.8 3.2-5.8.7 11.3c.4 6.2.6 11.7.5 12.2"></path><path d="M83.8 58.1c-1 .5-1.8 1.7-1.8 2.4 0 1.7 1.6 2 2.5.5.3-.6 2.2-1 4.1-1q3.6 0 3.2-1.3c-.6-1.6-5.8-2-8-.6m3.8 12.1c-2 2.8-2 3.9-.2 6.3 1.2 1.6 1.6 1.7 3 .6 2-1.7 2.1-6.4.2-8-1.1-1-1.7-.7-3 1.1m5 25.5c-1.1 1.2 2.7 4.3 6.1 4.9s9.3-1.1 9.3-2.7c0-.5-1.9-.6-4.3-.3q-4.4.6-7.4-.9c-1.7-.9-3.3-1.3-3.7-1m25.6-37.6a19 19 0 0 0-9.7 13c-2.1 11.7 9.3 22.5 20.9 19.9 16.6-3.7 19.4-26.2 4.2-33.1a17 17 0 0 0-15.4.2m14.2 2.3c9.6 4 11.2 17.3 3.1 24.5a13.5 13.5 0 0 1-15.4 2.5 14 14 0 0 1-8.8-14.7c.9-10.5 11.1-16.5 21.1-12.3"></path><path d="M122 71c-1.1 2.1.1 6 1.9 6s3.3-3.1 2.7-5.5c-.8-3-3.1-3.3-4.6-.5"></path></svg>
);

const CompareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" viewBox="0 0 161 130"><path d="M17.5 8C14 9.4 9.2 15.4 8 19.7q-2.2 9.2 4.9 16.4a16 16 0 0 0 26.4-5.2l2.2-5 10 .3c8.4.3 10.7.8 14.5 2.8a21 21 0 0 1 10.1 13.4c3.4 12.6 7.5 18.8 15.3 22.9 3.6 1.9 6.3 2.2 23.1 2.7 20.6.7 23.6 1.4 26.1 6.1 2.5 4.9 1.2 19.9-1.7 19.9-.6 0-2.4-1-4-2.3-2.3-1.7-4.4-2.2-8.8-2.2-7.7 0-13.2 3.5-15.6 9.9l-1.7 4.5-9.7.3c-7.7.2-9.6.6-9.6 1.8s1.8 1.6 9.5 1.8l9.5.3 1.9 4.5a16.7 16.7 0 0 0 28 4.7c3-3.3 4.9-10.7 3.8-14.8-.7-2.4-.3-4 1.7-7.9 3.3-6.5 3.6-17.3.5-22.6-3.8-6.6-6.6-7.4-27.9-8-20.5-.6-23.9-1.4-29.2-7.2A32 32 0 0 1 81 43.5a31 31 0 0 0-6.8-13.8c-5.2-5.6-9.7-7.1-21.9-7.5-11.1-.4-11.1-.4-11.8-3.1-.9-3.6-5.1-8.8-8.5-10.6A24 24 0 0 0 17.5 8m13.3 5c4.1 2.5 6.6 8.1 5.8 12.9-.7 4.3-5.9 9.9-10.1 10.7C16 38.5 8.2 25.9 14.3 16.9c4.1-6.1 10.5-7.6 16.5-3.9m101.5 82.2c3 1.6 5.7 7 5.7 11.6 0 3.7-.6 5-3.3 7.7-4.3 4.3-7.9 5.2-13.1 3.4-3.3-1.1-4.6-2.3-6.4-6.1-2.7-5.4-2.4-9 1-13.4a12.6 12.6 0 0 1 16.1-3.2M136.5 9c-.9 1.4.8 3.9 5.5 8.5l4.1 4-28.3.5c-24.3.4-28.3.7-28.3 2s3.9 1.5 28.5 1.8l28.4.2-5.4 5.5c-5.1 5.2-5.3 5.6-3.7 7.2s2.1 1.3 9.2-6.2c4.1-4.4 7.4-8.3 7.2-8.7-.1-.3-3.3-4.1-7-8.2-6.5-7.3-8.9-8.8-10.2-6.6M15.7 98a37 37 0 0 0-6.7 8.2A54 54 0 0 0 24.3 121c3 0 1.8-3.3-3-8.2l-4.7-4.8h27c14.9 0 27.3-.3 27.7-.6q.4-.6 0-2c-.4-1.2-5.3-1.4-27.6-1.4H16.6l4.7-4.8c2.6-2.6 4.7-5.5 4.7-6.5 0-3.5-3.8-1.5-10.3 5.3"></path></svg>
);

/* Stats band icons — stroked line-art, colored via currentColor so they
   follow the theme like the marks above. */
const RevisitIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 17c4.5-6 10.5-11 18-13" strokeDasharray="3 3" />
    <circle cx="4.5" cy="16" r="1.4" />
    <circle cx="11" cy="10.5" r="2" fill="currentColor" stroke="none" />
    <circle cx="18" cy="6" r="1.4" />
  </svg>
);

const BufferIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    <path d="M12 12h8.5" />
  </svg>
);

const FloorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 13h18" strokeDasharray="3 2" />
    <path d="M6 20v-3M10 20v-9M14 20v-5M18 20v-11" />
  </svg>
);

const ToleranceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 12h19" />
    <rect x="7.5" y="7.5" width="9" height="9" rx="2.5" strokeDasharray="3 2" />
    <path d="M12 5v14" />
  </svg>
);

export default function HomePage() {
  const reduce = useReducedMotion();

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh', color: 'var(--ink)' }}>

      {/* ─── ASYMMETRIC HERO ─── */}
      <section style={{ paddingTop: '128px', paddingBottom: '96px', overflow: 'hidden' }}>
        <div className="band-inner">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '64px',
            alignItems: 'center'
          }}>
            {/* Left Content */}
            <motion.div
              initial={reduce ? false : { opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ maxWidth: '600px' }}
            >
              <h1 className="t-display-xxl" style={{ marginBottom: '24px', color: 'var(--ink)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Verify public projects from space.
              </h1>

              <p className="t-body-lg" style={{ marginBottom: '40px', color: 'var(--body)', fontFamily: "'Roboto', sans-serif" }}>
                TerraGuard uses satellite data to check if government infrastructure is actually being built, or if the structures were already there before the contract started.
              </p>

              <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                <Button 
                  href="/dashboard" 
                  variant="solid"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '15px', height: '15px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  }
                >
                  Start Analysis
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })}
                >
                  How it works
                </Button>
              </div>
            </motion.div>

            {/* Right Asset — Public-Facing Graphic (Fresh Start) */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '440px', margin: '0 auto' }}
            >

              {/* Ambient neon halo — three blurred, independently breathing
                  color blobs behind the card, Antigravity-style ambient glow. */}
              <div className="hero-glow-wrap">
                <span className="hero-glow hero-glow-left" />
                <span className="hero-glow hero-glow-right" />
                <span className="hero-glow hero-glow-top" />

                <div
                  className="hero-glow-card transform hover:scale-[1.02] transition-transform duration-300"
                  style={{
                    width: '100%',
                    background: '#141414',
                    borderRadius: '16px',
                    border: '1px solid #2a2a2a',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                    padding: '28px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '17px',
                    /* This preview card is a fixed dark mock-up (hardcoded colors below) —
                       pin `color` here too so the icon's `currentColor` fill doesn't flip
                       with the site theme and vanish against the always-dark card. */
                    color: '#ededed'
                  }}
                >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <motion.div
                    animate={reduce ? undefined : { y: [0, -6, 0] }}
                    transition={reduce ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: '130px',
                      height: '130px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="flagged interview" viewBox="0 0 272 198"><path d="M113 34.9c0 23.5.6 30.1 2.4 25.5.3-.9.6-6.5.6-12.4V37.1l3.6-.7c2.6-.5 5.8 0 10.9 1.6a24 24 0 0 0 11.6 1.6c7.5-1.1 7.8-1.7 3.8-7.8l-3.6-5.3 3.5-4.8c4.4-6.1 3.8-7.8-2.5-7.1-3.5.5-6.3 0-10.3-1.5a34 34 0 0 0-11.2-2.1c-3.2 0-5.8-.4-5.8-1q-.2-1-1.5-1c-1.3 0-1.5 3.5-1.5 25.9m17.2-19.8c3.4 1.2 8.1 2.2 10.5 2.3 2.3 0 4.3.3 4.3.6s-1.3 2.1-3 4a23 23 0 0 0-3 4.3c0 .5 1.3 2.8 3 5.1 1.6 2.4 2.6 4.6 2.3 5-1.3 1.3-8.2.5-13.9-1.5a25 25 0 0 0-10.1-1.6l-4.3.5v-9.9c0-9.3.1-9.8 2.3-10.2 4.4-.8 5.8-.7 11.9 1.4M54 11.6 50.5 13c-1.1.5-4.2 1.1-6.8 1.3-4.9.5-9.7 3.6-9.7 6.4 0 .7-1.8 2.4-4.1 3.9-5.3 3.3-7.9 9.2-8.6 19.4-.9 12 2.9 20.3 13.8 30.8 4.8 4.6 4.9 4.8 3.9 8.4-.8 2.8-2.1 4.3-5.5 6.2a47 47 0 0 0-18 27.3c-2.2 8.2-3.5 30.6-2.7 45.3 1.1 19.8 2.7 14.7 2.8-9 .1-21.6 1.3-33.1 4.6-41.7a48 48 0 0 1 14.1-19.2l3.6-2.2 8.2 5.5c4.5 3.1 9.7 5.8 11.5 6.2 2.8.5 3.6 1.4 5.7 6.2a99 99 0 0 1 5.9 25.1c.3 3.3.1 3.4-8.2 7.7l-8.5 4.3-.7-4.2a90 90 0 0 1-.7-9.7q-.1-9.9-2.4-10-.9 0-.3 12.9c.7 12.5.7 12.9-1.3 13.6-2.1.6-3 3.5-1.1 3.5.6 0 6.8-2.9 13.9-6.5l13-6.4 1.5 4.7c.9 2.6 2.5 6 3.5 7.6l1.9 2.8-3.7 3.2C65.3 166 49.2 175 43 175c-10.7-.1-14.7-9.1-15.7-35.8q-.5-15.6-1.7-14.9-1.1.4-1 14.3c.1 21.5 3.3 32.9 10.6 37.4q9.5 5.8 28.2-6.5c3.8-2.5 7.1-4.5 7.2-4.5s.4 2.5.4 5.5c0 4.2.3 5.5 1.5 5.5s1.5-1.4 1.5-7c0-6.9 0-6.9 4-10.1 2.2-1.8 4.2-4 4.5-5.1q.8-1.7 2.4-1.8c1.4 0 1.7.6 1.3 2.9q-.5 2.9 1.3 3.5 3.4 1.1 6.2-5.1c.7-1.8 1.9-3.3 2.7-3.3 2.4 0 6.4-3.9 8.4-8.3q4.6-9.9 4.1-11.8c-.1-.8.1-2.7.6-4.3.7-2.4.4-3.3-1.5-4.8-2.7-2.2-2.1-6.8.9-6.8 1 0 2.8-.8 4-1.8a43 43 0 0 0 7.1-17.8c0-3.8-2.7-8.2-6-9.9-7.6-3.9-14.3.2-17.9 11-2.5 7.8-2.6 8.7-.5 12.6 1.9 3.8 1 7.2-1.7 6.4-4.6-1.5-11.4 5-18.1 17.4-.9 1.7-2.1 3.1-2.6 3.1s-1.3-3.8-2-8.3a96 96 0 0 0-7.6-25.5c-1.4-2.6-1.5-4-.6-7.2 1.1-3.9 1.2-4 5.6-4 5.4 0 10.7-2.3 12.8-5.5a42 42 0 0 0 3.4-9.5c1.4-5.4 2.4-7.4 4.2-8.3q6-3 2.2-7.4c-4.7-5.9-5.4-7.4-6.4-14a34 34 0 0 1-.2-14.9c1.3-9.2-5.7-16.3-17.5-17.6-3.6-.4-7.7-.9-9.1-1.2a9 9 0 0 0-4 0m23.3 21.2c2.6 2.8 4.4 8.2 5.2 14.9.6 5.1 1.3 6.9 4.3 10.4 3.4 4 3.5 4.2 1.7 5.5-1 .8-2.5 1.4-3.2 1.4-1.2 0-1.7 1.4-2.5 6.5-.3 1.6-1.1 2-4.1 1.8-4.9-.3-5.1 2.3-.2 3.3l3.4.6-1.9 3.7c-2.3 4.5-5.5 6.1-12.3 6.1-5.2 0-5.3.1-6.6 3.7-3.3 9.2-2.7 8.6-6.3 6.7A50 50 0 0 1 41 87.6c0-3.4 2.2-8.4 4-8.9 1-.3 2.6-2.2 3.4-4.2 2.1-4.9 2-5.5-.4-5.5-3.3 0-7-4.4-7-8.4 0-5.8 4.3-8.4 8.2-4.9 1.4 1.3 2.3 1.5 3.6.7 1.7-1.1 4.7-9.9 5.8-16.9.5-3.7.9-4.2 5.7-6.1q9.9-4 13-.6m16.7 85q-.2 1-1.5 2.8a7 7 0 0 0-1.5 2.8c0 .9 10.4.2 13.2-.9s3.6 2.5 1 4.3c-2.5 1.7-2.9 3.2-.7 3.2 2 0 1.9 2.6-.1 3.4q-1.5.6-1 2.3t-1.4 3.8c-1.2 1.2-2 2.8-1.8 3.5.5 2.2-5.6 5-12.7 5.9l-6.7.8-2.4-5.1a30 30 0 0 1-2.4-6.3c0-2.4 7.2-14 11-17.6 3.6-3.4 7-4.8 7-2.9m-3.9 36.5q-1.2 1.2-1.1-.4c0-2 1.3-3.4 1.8-1.9q.3 1.2-.7 2.3"></path><path d="M73.7 50.6c-.4.4-.7 2-.7 3.6 0 2.2.5 2.8 2.1 2.8s2-.5 1.7-3.2c-.3-3.1-1.7-4.5-3.1-3.2m121.8-30.4-8 2c-7.6 2-14.2 12.1-11.9 18.6 1.8 5-1.1 15.6-5.8 21.5-2.6 3.2-1.9 5.3 2.4 7.4 2 1 2.6 2.2 3.1 6.4.8 6.8 4 13 7.7 15.2a19 19 0 0 0 7.7 2c4.8.2 4.8.2 5.7 4.4.8 3.8.6 4.7-1.7 8a72 72 0 0 0-10.7 31.6c0 4.8-1.3 5-8.3 1.6-5.7-2.9-6.8-3.8-8.2-7.5-.9-2.4-3.2-5.7-5.1-7.4-4.1-3.6-3.9-5.8.9-8 2.8-1.3 3.6-2.6 6-9.8s2.6-8.9 1.7-11.8q-2.5-7.3-10.6-7.4c-6.3 0-9.9 3.4-12.5 12.1-2.2 7.2-2 11 .7 14 2 2.2.9 4.3-2.8 5.5-1.7.5-3.4 1.6-3.8 2.4l-2.4 4.7c-.9 1.8-1.9 6.2-2.3 9.8-.5 5.3-.3 6.9 1.1 8.4 1.2 1.4 1.6 3.3 1.4 7.2-.3 5.2-.2 5.4 2.4 5.7 2.4.3 2.8-.2 3.9-3.7 1.1-3.6 1.4-4 2.8-2.7.9.7 3.4 1.9 5.5 2.6 2.2.7 5.7 2.9 7.7 4.9 2.1 2 8.4 6.5 14 9.9 7.8 4.9 10.4 6.1 11.3 5.2q1.2-1.3 0-1.7c-.9-.3-20.9-13.3-23.8-15.4-.5-.4.5-2.6 2.2-5s3.4-5.6 3.8-7.2c.3-1.5 1-3 1.5-3.2s4.4 1.2 8.8 3.5 8.3 4 8.6 4c1.1 0 .4-2.4-1.1-3.4-1.4-1.1-1.5-2.1-.4-9.1a83 83 0 0 1 7.7-24.7c1.8-3.1 2.2-3.3 7-3 5.5.4 11.2-1.8 14.7-5.7 1.4-1.6 3.1-2.1 6.7-2.1 4.2 0 5.2.5 9.1 4.3 2.4 2.3 5.4 6.3 6.6 8.8 2.5 5.1 5 15.5 4 16.4-.4.4-1.7.1-3-.6-1.2-.7-5.7-1.3-9.8-1.4-6.2 0-8.5.5-13.2 2.8a31.2 31.2 0 0 0-9.6 48.2 30 30 0 0 0 42.7 2.9c7.4-6.6 9.4-11 9.9-21.7.4-8.3.3-9.1-2.7-15.2a34 34 0 0 0-6.9-9.5c-3.2-2.6-3.8-3.8-4.8-9.9a42 42 0 0 0-10.1-21.9c-2.2-2.3-3.6-4.2-3-4.2 2.6 0 8-3.6 9.4-6.3 2.3-4.5 1.4-13.2-2-18.2-3.2-4.9-3.5-6.9-1.8-15.8 1.7-8.7.8-16.1-3-23.6a27 27 0 0 0-13.3-13.3 52 52 0 0 0-26.1-1.6m-.1 20c.4 2.1 2.2 5.8 4.1 8.3s3.5 5.5 3.5 6.8c0 2.7 2.6 6.7 4.4 6.7q1.4-.2 2.6-1.5c1.9-2.2 4.7-1.8 6.6 1 1.3 2 1.4 3 .4 6-1.2 3.7-4.7 6.8-7.1 6.3q-1.3-.2-1.5 2.2c0 1.4-.6 3.8-1.3 5.3-2.7 6.8-.8 13.1 5.1 16.7l2.9 1.8-3.1 2.2a19 19 0 0 1-7.6 2.8c-4.3.4-4.4.4-4.5-2.4 0-1.6-.6-4.9-1.2-7.3l-1.2-4.5h-5.7c-5-.1-6.1-.5-8.7-3.1a16 16 0 0 1-3.5-5.1c-.5-1.7-.1-2.3 2.5-3 4-1.2 3.4-3-.8-2.6-2.9.3-3.3.1-3.3-2 0-3.7-1.1-6.8-2.4-6.8-.7 0-2.1-.6-3.1-1.4-1.8-1.3-1.8-1.5 1.2-5 1.8-2 3.5-5.2 3.8-7.3 2.3-14.4 4.7-18.3 11.6-19.2 4.9-.7 5.3-.4 6.3 5.1m-38.7 77.4c.3.8-.1 2.3-1 3.1-2 2.1-4.7.2-4-2.7.6-2.4 4.1-2.7 5-.4M149 122c1.2.8 1.2 1.1-.3 2.8-.9 1-1.7 2.5-1.7 3.4 0 1.5 2.5 4.2 4.6 4.9q1 .5.2 3.6-1.3 5.8-8.5 1.3c-3.5-2.1-4.3-4-1.8-4 1.8 0 1.8-.5.4-3.1-.9-1.7-.7-2.1 1.1-2.6 1.7-.5 2-1.1 1.5-3-.9-3.9 1.1-5.5 4.5-3.3m10.3 3.2c3 1.6 4.3 3.4 6.7 9.9l2.2 5.7-2.6 5.1c-2.4 4.7-2.9 5.1-6.2 5.1-1.9 0-4.8-.7-6.4-1.5-2.7-1.4-2.9-1.7-1.8-4.3q3-7 4.3-5.3c1.1 1.9 2.6.2 1.5-1.8-.5-1-.8-3.1-.7-4.7.2-2.6-.1-2.9-3-3.2-4.9-.5-4-4.2 1.2-5.5l2.3-.6c.2 0 1.3.4 2.5 1.1m83.7 8.4a27 27 0 0 1 14.3 24.9c0 8.2-1.7 12.8-7 18.6a27.6 27.6 0 0 1-38.6 1.9 28.6 28.6 0 0 1-3.1-38.5 27.4 27.4 0 0 1 34.4-6.9m-96.7 8.6c3.3 1.2 3 3.4-.4 3-2.4-.3-5.9-2.9-5.9-4.5q.2-.8 1.8-.2zm-2.1 8.3c-.5 2.8-2.2 4.4-2.2 2.1 0-2.1 1.1-4.6 2-4.6q.6.2.2 2.5"></path><path d="M183.4 55.4c-.9 2.3 0 5.1 1.6 5.1q1.5 0 1.5-2.9c0-3.2-2.1-4.7-3.1-2.2m38.2 88.3c-.3.4-.6 7.5-.6 16 0 12.9.2 15.3 1.5 15.3 1.2 0 1.5-1.5 1.5-7.4 0-7 .1-7.4 2.4-8 1.3-.3 4 .1 6 .9 4.4 1.9 6.7 1.9 9.1.1 1.9-1.4 1.9-1.4 0-3.6-1.9-2.1-1.9-2.3-.2-5.2 2.4-4.1 2.2-4.4-2-4.4-3.8 0-12.4-1.9-15.4-3.5-.9-.4-2-.5-2.3-.2"></path></svg>
                  </motion.div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ 
                      color: '#ef4444', 
                      fontSize: '15px', 
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontWeight: 700, 
                      
                    }}>
                      Flagged for Review
                    </div>
                    <div style={{ 
                      color: '#ffffff', 
                      fontSize: '22px', 
                      fontWeight: 600, 
                      lineHeight: 1.1,
                      fontFamily: "'IBM Plex Sans', sans-serif" 
                    }}>
                      Pre-Existing Structure
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: '100%', height: '1px', background: '#2a2a2a' }}></div>

                {/* Grid Data */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ 
                        color: '#888888', 
                        fontSize: '13px', 
                        fontWeight: 500, 
                        fontFamily: "'Roboto', sans-serif"
                      }}>
                      Claimed Start
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, fontFamily: "'Roboto', sans-serif" }}>
                      Jan 15, 2023
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                        color: '#888888', 
                        fontSize: '13px', 
                        fontWeight: 500, 
                        fontFamily: "'Roboto', sans-serif"
                    }}>
                      Detected Start
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, fontFamily: "'Roboto', sans-serif" }}>
                      Nov 04, 2022
                    </div>
                  </div>
                </div>

                {/* Footer Block */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '10px',
                  padding: '14px 20px',
                  marginTop: '4px'
                }}>
                  <span style={{ color: '#888888', fontSize: '13.5px', fontFamily: "'Roboto', sans-serif" }}>Discrepancy</span>
                  <span style={{ color: '#ef4444', fontSize: '15px', fontWeight: 600, fontFamily: "'Roboto', sans-serif" }}>72 days early</span>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS — stacked feature rows ─── */}
      <section id="how-it-works" className="section-dark" style={{ padding: '96px 0', borderTop: '1px solid var(--hairline)' }}>
        <div className="band-inner">
          <motion.h2
            className="t-display-xl"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: '64px', maxWidth: '480px', fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Independent verification pipeline
          </motion.h2>

          <div>
            {[
              {
                step: '01',
                title: 'Pull SAR Data',
                body: 'Query Sentinel-1 GRD backscatter at the given coordinates via Google Earth Engine. Radar penetrates clouds, providing a reliable historical time series regardless of weather.',
                Icon: SatelliteIcon
              },
              {
                step: '02',
                title: 'Detect Change',
                body: 'Apply rolling median filters to reduce SAR speckle noise, then run ruptures.Pelt change point detection on the VV time series to find the exact moment of ground disruption.',
                Icon: InvestigateIcon
              },
              {
                step: '03',
                title: 'Return Verdict',
                body: 'Compare the mathematically detected construction date against the official Notice-to-Proceed (NTP) date. Timeline discrepancies and missing construction signals are flagged for review.',
                Icon: CompareIcon
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="how-row"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <div>
                  <div className="t-micro-cap" style={{ marginBottom: '12px' }}>{item.step}</div>
                  <h3 className="t-display-sm" style={{ marginBottom: '12px', fontFamily: "'IBM Plex Sans', sans-serif" }}>{item.title}</h3>
                  <p className="t-body" style={{ color: 'var(--body)', maxWidth: '520px', fontFamily: "'Roboto', sans-serif" }}>
                    {item.body}
                  </p>
                </div>
                <div className="how-row-icon">
                  <item.Icon />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* ─── STATS BAND — soft tiles ─── */}
      <section style={{ background: 'var(--canvas)', padding: '0 0 96px 0' }}>
        <div className="band-inner">
          <div className="hairline" style={{ marginBottom: '56px' }} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            alignItems: 'stretch',
          }}>
            {[
              { label: 'Satellite revisit', value: '6–12', unit: 'days', desc: 'Frequency of new satellite imagery.', Icon: RevisitIcon },
              { label: 'Buffer radius', value: '30', unit: 'm', desc: 'Scan area around target coordinates.', Icon: BufferIcon },
              { label: 'Confidence floor', value: '30', unit: '%', desc: 'Filters out seasonal vegetation and minor ground shifts to prevent false alarms.', Icon: FloorIcon },
              { label: 'Tolerance', value: '±12', unit: 'days', desc: 'Grace period from contract date.', Icon: ToleranceIcon },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--canvas-soft)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '18px',
                  padding: '22px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '13px',
                    background: 'var(--canvas)',
                    border: '1px solid var(--hairline)',
                    color: 'var(--mute)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: '19px', height: '19px', display: 'block' }}>
                    <s.Icon />
                  </span>
                </span>

                <div className="t-micro-cap" style={{ marginBottom: '10px', fontFamily: "'Roboto', sans-serif" }}>{s.label}</div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '10px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  <span className="stat-num">{s.value}</span>
                  <span style={{ fontSize: '14px', color: 'var(--mute)', fontFamily: "'Roboto', sans-serif" }}>{s.unit}</span>
                </div>

                <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--mute)', fontFamily: "'Roboto', sans-serif", marginTop: 'auto' }}>
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding: '48px 0', background: 'var(--canvas)', borderTop: '1px solid var(--hairline)' }}>
        <div className="band-inner" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: '0 1 200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0 }}>
                <Image src={logo} alt="" fill sizes="250px" style={{ objectFit: 'contain' }} className="logo-mark logo-mark-dark" />
                <Image src={logoLight} alt="" fill sizes="250px" style={{ objectFit: 'contain' }} className="logo-mark logo-mark-light" />
              </div>
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '14px', fontWeight: 600 }}>TerraGuard</span>
            </div>
            <p className="t-caption" style={{ lineHeight: 1.6, fontFamily: "'Roboto', sans-serif" }}>
              Satellite-verified public infrastructure audits for the Philippines.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '0 1 240px' }}>
            <div className="t-micro-cap" style={{ fontFamily: "'Roboto', sans-serif" }}>Developers &amp; Researchers</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                'Esguerra, Adrian Nash M.',
                'Halili, Joshua Emmanuel M.',
                'Sardeng, Matthew A.',
                'Viray, Charles Dwayne R.',
                'Victoria Loven Ponce P. ',
              ].map(name => (
                <li key={name} style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13.5px', color: 'var(--body)' }}>
                  {name}
                </li>
              ))}
            </ul>
          </div>

          <p className="t-caption" style={{ maxWidth: '420px', flex: '1 1 320px', lineHeight: 1.6, fontFamily: "'Roboto', sans-serif" }}>
            Powered by live Google Earth Engine Sentinel-1 GRD telemetry via earthengine-api.
            Algorithm: ruptures.Pelt (RBF cost function).<br /><br />
            <span style={{ color: 'var(--mute)' }}>
              Results are indicative only and intended to support authorized audits. They do not constitute legal findings or accusations of wrongdoing.
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}