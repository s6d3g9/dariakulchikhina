<template>
  <div class="min-h-screen flex items-center justify-center bg-white">
    <div class="text-center">
      <h1 class="text-2xl font-light tracking-widest uppercase mb-8 text-gray-800">
        dariakulchikhina
      </h1>
      <div class="flex flex-col gap-3 text-sm">
        <NuxtLink to="/admin/login" class="px-8 py-2 border border-gray-300 hover:border-gray-600 text-gray-600 hover:text-gray-900 transition-colors">
          Вход для дизайнера
        </NuxtLink>
        <NuxtLink to="/client/login" class="px-8 py-2 border border-gray-300 hover:border-gray-600 text-gray-600 hover:text-gray-900 transition-colors">
          Вход для клиента
        </NuxtLink>
        <NuxtLink to="/contractor/login" class="px-8 py-2 border border-gray-300 hover:border-gray-600 text-gray-600 hover:text-gray-900 transition-colors">
          Вход для подрядчика
        </NuxtLink>
      </div>
    </div>
  </div>
</template>