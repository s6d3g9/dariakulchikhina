#!/usr/bin/env tsx
/**
 * Seed script: создаёт тестового дизайнера, клиентов, подрядчиков и проекты.
 * Запуск: pnpm tsx scripts/seed-designer.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import {
  designers,
  designerAccounts,
  clients,
  contractors,
  projects,
  designerProjects,
  designerProjectClients,
  designerProjectContractors,
} from '../server/db/schema'

const client = postgres(process.env.DATABASE_URL || 'postgresql://daria:daria_secret_2026@localhost:5433/daria_admin')
const db = drizzle(client)

async function main() {
  console.log('🌱 Seed начат...')

  // 1. Дизайнер
  const [designer] = await db.insert(designers).values({
    name: 'Лиза Дизайнова',
    phone: '+7 900 111 22 33',
    email: 'test@designer.ru',
    telegram: '@liza_design',
    city: 'Москва',
    experience: '6 лет',
    about: 'Создаю уютные и функциональные интерьеры. Специализируюсь на жилых квартирах и загородных домах.',
    specializations: ['Квартиры', 'Загородные дома', 'Офисы'],
    availabilityStatus: 'free',
    canTakeOrder: true,
    packages: [
      { name: 'Стандарт', pricePerSqm: 3500, description: 'Планировка + 3D + рабочая документация' },
      { name: 'Премиум', pricePerSqm: 5500, description: 'Стандарт + авторский надзор' },
    ],
    services: [
      { name: 'Дизайн-проект квартиры', price: 'от 3 500 ₽/м²' },
      { name: 'Авторский надзор', price: 'от 10 000 ₽/выезд' },
      { name: 'Подбор материалов', price: '15 000 ₽' },
    ],
  }).returning()
  console.log(`✅ Дизайнер id=${designer.id}`)

  // 2. Аккаунт
  const passwordHash = await bcrypt.hash('test123', 12)
  await db.insert(designerAccounts).values({
    designerId: designer.id,
    email: 'test@designer.ru',
    passwordHash,
  }).onConflictDoNothing()
  console.log('✅ Аккаунт: test@designer.ru / test123')

  // 3. Клиенты
  const clientRows = await db.insert(clients).values([
    { name: 'Иванова Мария', phone: '+7 916 123 45 67', email: 'ivanova@mail.ru', messenger: 'WhatsApp', messengerNick: '+79161234567', address: 'Москва, ул. Ленина 10, кв. 5' },
    { name: 'Петров Андрей', phone: '+7 903 987 65 43', email: 'petrov@gmail.com', messenger: 'Telegram', messengerNick: '@andrey_petrov', address: 'Москва, Арбат 25, кв. 12' },
    { name: 'Сидорова Елена', phone: '+7 926 555 10 20', email: 'sidorova@yandex.ru', address: 'Подмосковье, Красногорск, пр. Победы 8' },
  ]).returning()
  console.log(`✅ Клиентов: ${clientRows.length}`)

  // 4. Подрядчики
  const [c1, c2, c3] = await db.insert(contractors).values([
    { slug: `elec-alex-${Date.now()}`, name: 'Алексей Власов', phone: '+7 915 200 30 40', contractorType: 'master', workTypes: ['Электрика'], telegram: '@alex_elec' },
    { slug: `plumb-dima-${Date.now()}`, name: 'Дмитрий Орлов', phone: '+7 926 300 40 50', contractorType: 'master', workTypes: ['Сантехника'], telegram: '@dmitry_plumb' },
    { slug: `build-ivan-${Date.now()}`, name: 'Иван Строев', phone: '+7 903 400 50 60', contractorType: 'master', workTypes: ['Строительство', 'Черновая отделка'] },
  ]).returning()
  console.log(`✅ Подрядчиков: 3`)

  // 5. Проект 1: Активный
  const [proj1] = await db.insert(projects).values({
    slug: `ivanova-alfa-${Date.now()}`,
    title: 'Квартира Ивановых, ЖК Альфа',
    status: 'active',
  }).returning()

  const [dp1] = await db.insert(designerProjects).values({
    designerId: designer.id,
    projectId: proj1.id,
    packageKey: 'Премиум',
    pricePerSqm: 5500,
    area: 72,
    totalPrice: 396000,
    status: 'active',
    notes: 'Скандинавский стиль, открытая планировка, бюджет до 4 млн.',
  }).returning()

  await db.insert(designerProjectClients).values({ designerProjectId: dp1.id, clientId: clientRows[0].id })
  await db.insert(designerProjectContractors).values([
    { designerProjectId: dp1.id, contractorId: c1.id, role: 'Электрик' },
    { designerProjectId: dp1.id, contractorId: c2.id, role: 'Сантехник' },
  ])
  console.log(`✅ Проект 1 id=${dp1.id}: ${proj1.title}`)

  // 6. Проект 2: Черновик
  const [proj2] = await db.insert(projects).values({
    slug: `petrov-arbat-${Date.now()}`,
    title: 'Апартаменты Петрова, Арбат',
    status: 'draft',
  }).returning()

  const [dp2] = await db.insert(designerProjects).values({
    designerId: designer.id,
    projectId: proj2.id,
    packageKey: 'Стандарт',
    pricePerSqm: 3500,
    area: 58,
    totalPrice: 203000,
    status: 'draft',
    notes: 'Минимализм, светлые тона.',
  }).returning()

  await db.insert(designerProjectClients).values({ designerProjectId: dp2.id, clientId: clientRows[1].id })
  console.log(`✅ Проект 2 id=${dp2.id}: ${proj2.title}`)

  // 7. Проект 3: Завершённый
  const [proj3] = await db.insert(projects).values({
    slug: `sidorova-krasnogorsk-${Date.now()}`,
    title: 'Дом Сидоровых, Красногорск',
    status: 'completed',
  }).returning()

  const [dp3] = await db.insert(designerProjects).values({
    designerId: designer.id,
    projectId: proj3.id,
    packageKey: 'Премиум',
    pricePerSqm: 5500,
    area: 140,
    totalPrice: 770000,
    status: 'completed',
    notes: 'Загородный дом, 2 этажа, стиль прованс.',
  }).returning()

  await db.insert(designerProjectClients).values({ designerProjectId: dp3.id, clientId: clientRows[2].id })
  await db.insert(designerProjectContractors).values({ designerProjectId: dp3.id, contractorId: c3.id, role: 'Главный строитель' })
  console.log(`✅ Проект 3 id=${dp3.id}: ${proj3.title}`)

  console.log('\n🎉 Seed завершён!')
  console.log('   Логин: test@designer.ru')
  console.log('   Пароль: test123')
  console.log('   URL: http://localhost:3000/designer/login')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => client.end())
