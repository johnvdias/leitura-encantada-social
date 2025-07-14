import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Layout } from "@/components/Layout";
import { TrendingUp, Users, User, Globe } from "lucide-react";

export function Feed() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feed Social</h1>
          <p className="text-gray-600">
            Acompanhe as atividades de leitura da comunidade e dos seus amigos
          </p>
        </div>

        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Comunidade
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Amigos
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Minhas Atividades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-6">
            <ActivityFeed scope="global" />
          </TabsContent>

          <TabsContent value="friends" className="mt-6">
            <ActivityFeed scope="friends" />
          </TabsContent>

          <TabsContent value="personal" className="mt-6">
            <ActivityFeed scope="user" />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
