import React from "react";
import { BookLists } from "@/components/BookLists";
import { Layout } from "@/components/Layout";

export function Listas() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Listas de Livros
          </h1>
          <p className="text-gray-600">
            Organize e compartilhe suas coleções de livros favoritos
          </p>
        </div>

        <BookLists />
      </div>
    </Layout>
  );
}
