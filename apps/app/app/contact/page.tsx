import type { Metadata } from "next";
import { ContactForm } from "./components/contact-form";

export const metadata: Metadata = { title: "Suporte | EXECUTAR" };

const ContactPage = () => <ContactForm />;

export default ContactPage;
