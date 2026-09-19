import { prisma } from "@/lib/prisma";
import MufrodatForm from "../../components/MufrodatForm";
import { notFound } from "next/navigation";

export const metadata = {
  title: 'Edit Mufrodat | Admin',
};

export default async function EditMufrodatPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const word = await prisma.word.findUnique({
    where: { id: params.id },
  });

  if (!word) {
    notFound();
  }

  return (
    <div className="py-6">
      <MufrodatForm initialData={word} />
    </div>
  );
}
