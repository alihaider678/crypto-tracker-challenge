import { PageHeader } from "@/components/layout/page-header";

export default function OverviewPage() {
  return (
    <section className="container-page py-10 md:py-16">
      <PageHeader
        title="Overview"
        description="Market summary, the featured VANRY pair and today's top movers."
      />
    </section>
  );
}
