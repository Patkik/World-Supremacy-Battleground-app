import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
export const metadata: Metadata = { title: "Contact WSB", description: "Contact World Supremacy Battlegrounds through the official inquiry form.", alternates: { canonical: "/contact" } };
export default function Page(){return <ContactForm/>;}
