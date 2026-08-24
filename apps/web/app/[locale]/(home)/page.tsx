import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { CTA } from "./components/cta";
import { FAQ } from "./components/faq";
import { Features } from "./components/features";
import { Hero } from "./components/hero";

export const metadata: Metadata = createMetadata({
  title: "EXECUTAR · Próximo 1 por vez",
  description:
    "Transforme planos em entregas com foco, dependências reais, evidências e Copiloto operacional.",
});

const Home = () => (
  <>
    <Hero />
    <Features />
    <FAQ />
    <CTA />
  </>
);

export default Home;
