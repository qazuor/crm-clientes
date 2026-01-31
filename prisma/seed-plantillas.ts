import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📧 Creando plantillas de contacto...\n');

  // Get admin user for creadoPorId
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('❌ No se encontró un usuario ADMIN. Ejecuta el seed principal primero.');
    process.exit(1);
  }

  // Clean existing plantillas
  console.log('🧹 Limpiando plantillas existentes...');
  await prisma.plantillaContacto.deleteMany({});

  const plantillas = [
    // ═══════════════════════════════════════════════════
    // EMAIL: PRIMER CONTACTO - CON SITIO WEB
    // ═══════════════════════════════════════════════════
    {
      nombre: '🌐 Primer contacto - Con sitio web',
      descripcion: 'Para clientes que ya tienen sitio web. Ofrece mejoras, rediseño y optimización.',
      canal: 'EMAIL' as const,
      asunto: '👋 {nombre} — Vimos tu sitio web y tenemos ideas para vos',
      cuerpo: `<h2>¡Hola {nombre}! 👋</h2>

<p>Soy del equipo de <strong>desarrollo digital</strong> y estuvimos mirando tu sitio web. Nos gustó mucho lo que hacés y creemos que podríamos ayudarte a <strong>llevar tu presencia online al siguiente nivel</strong>. 🚀</p>

<p>Trabajamos con empresas de <strong>{industria}</strong> en {ciudad} y tenemos experiencia ayudando negocios como el tuyo a:</p>

<ul>
  <li>✨ <strong>Rediseño moderno</strong> — Interfaces atractivas que convierten visitantes en clientes</li>
  <li>📱 <strong>Optimización mobile</strong> — Tu sitio perfecto en cualquier dispositivo</li>
  <li>⚡ <strong>Velocidad y SEO</strong> — Carga rápida y posicionamiento en Google</li>
  <li>🔒 <strong>Seguridad SSL</strong> — Protección y confianza para tus usuarios</li>
  <li>📊 <strong>Analytics y métricas</strong> — Datos para tomar mejores decisiones</li>
</ul>

<p>¿Te gustaría que hagamos un <strong>análisis gratuito</strong> de tu sitio actual? Sin compromiso, te mostramos oportunidades de mejora concretas. 💡</p>

<p>Podés responder este email o escribirnos por WhatsApp. ¡Estamos para ayudarte!</p>

<p>Saludos,<br>
<strong>Equipo de Desarrollo</strong> 💻</p>`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // EMAIL: PRIMER CONTACTO - SIN SITIO WEB
    // ═══════════════════════════════════════════════════
    {
      nombre: '🆕 Primer contacto - Sin sitio web',
      descripcion: 'Para clientes que aún no tienen presencia web. Ofrece creación desde cero.',
      canal: 'EMAIL' as const,
      asunto: '💡 {nombre} — Tu negocio merece estar en internet',
      cuerpo: `<h2>¡Hola {nombre}! 👋</h2>

<p>Nos especializamos en ayudar a empresas de <strong>{industria}</strong> en {ciudad} a dar el salto al mundo digital. 🌐</p>

<p>Hoy en día, <strong>el 87% de los consumidores</strong> buscan online antes de comprar. Si tu negocio no tiene presencia web, estás perdiendo oportunidades todos los días. 📉</p>

<p>Podemos crear para vos:</p>

<ul>
  <li>🎨 <strong>Sitio web profesional</strong> — Diseño moderno que refleje tu marca</li>
  <li>📱 <strong>100% responsivo</strong> — Perfecto en celular, tablet y computadora</li>
  <li>🔍 <strong>Optimizado para Google</strong> — Que te encuentren cuando buscan lo que ofrecés</li>
  <li>💬 <strong>WhatsApp integrado</strong> — Tus clientes te escriben con un clic</li>
  <li>📧 <strong>Email profesional</strong> — Correo con tu dominio (ej: info@tunegocio.com)</li>
  <li>📊 <strong>Panel de estadísticas</strong> — Conocé quién visita tu sitio</li>
</ul>

<p>🎁 <strong>Oferta especial:</strong> Hacemos una <strong>consulta gratuita</strong> donde te mostramos cómo se vería tu sitio y un plan a medida.</p>

<p>¿Te interesa? ¡Respondé este email o escribinos por WhatsApp!</p>

<p>Saludos,<br>
<strong>Equipo de Desarrollo</strong> 💻</p>`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // EMAIL: AUTOMATIZACIONES
    // ═══════════════════════════════════════════════════
    {
      nombre: '🤖 Primer contacto - Automatizaciones',
      descripcion: 'Ofrece automatización de procesos, bots, integraciones y eficiencia operativa.',
      canal: 'EMAIL' as const,
      asunto: '🤖 {nombre} — Automatizá tu negocio y ahorrá horas de trabajo',
      cuerpo: `<h2>¡Hola {nombre}! 👋</h2>

<p>¿Cuántas horas por semana perdés en tareas repetitivas? Responder los mismos mensajes, pasar datos de un sistema a otro, generar reportes manualmente... ⏰</p>

<p>Trabajamos con empresas de <strong>{industria}</strong> implementando <strong>automatizaciones</strong> que transforman la forma de trabajar. Algunos ejemplos:</p>

<ul>
  <li>🤖 <strong>Chatbots inteligentes</strong> — Atendé consultas 24/7 en WhatsApp, Instagram y tu web</li>
  <li>📋 <strong>Flujos automáticos</strong> — Cuando llega un pedido, se genera factura, se notifica al equipo y se actualiza el stock</li>
  <li>📊 <strong>Reportes automáticos</strong> — Dashboards que se actualizan solos con datos en tiempo real</li>
  <li>📧 <strong>Email marketing inteligente</strong> — Secuencias que se envían según el comportamiento del cliente</li>
  <li>🔗 <strong>Integraciones</strong> — Conectamos tu CRM, facturación, e-commerce y redes sociales</li>
  <li>📱 <strong>Notificaciones</strong> — Alertas automáticas por WhatsApp, email o Slack</li>
</ul>

<p>💡 <strong>Caso real:</strong> Una empresa de {industria} redujo un <strong>70% el tiempo administrativo</strong> con nuestras automatizaciones.</p>

<p>¿Querés saber qué procesos de tu negocio podemos automatizar? Te ofrecemos una <strong>consultoría gratuita de 30 minutos</strong> donde identificamos las oportunidades. 🎯</p>

<p>¡Escribinos y agendamos!</p>

<p>Saludos,<br>
<strong>Equipo de Automatización</strong> ⚙️</p>`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // EMAIL: APPS MÓVILES Y WEB APPS
    // ═══════════════════════════════════════════════════
    {
      nombre: '📱 Primer contacto - Apps y plataformas',
      descripcion: 'Ofrece desarrollo de apps móviles, web apps, plataformas y sistemas a medida.',
      canal: 'EMAIL' as const,
      asunto: '📱 {nombre} — Llevá tu negocio al celular de tus clientes',
      cuerpo: `<h2>¡Hola {nombre}! 👋</h2>

<p>Las mejores empresas de <strong>{industria}</strong> ya tienen su propia app o plataforma digital. ¿Te imaginás lo que podría hacer por tu negocio? 🚀</p>

<p>No hablamos solo de un sitio web. Hablamos de <strong>herramientas digitales que transforman</strong> la experiencia de tus clientes y la eficiencia de tu equipo:</p>

<ul>
  <li>📱 <strong>App móvil nativa</strong> — Tu marca en el celular de cada cliente (iOS + Android)</li>
  <li>🖥️ <strong>Web App / Plataforma</strong> — Sistemas a medida accesibles desde cualquier navegador</li>
  <li>🛒 <strong>E-commerce avanzado</strong> — Tienda online con pagos, envíos y gestión de inventario</li>
  <li>👥 <strong>Portal de clientes</strong> — Donde tus clientes consultan pedidos, facturas y estado de servicios</li>
  <li>📋 <strong>Sistema de gestión</strong> — CRM, turnos, reservas, o lo que tu negocio necesite</li>
  <li>🔔 <strong>Notificaciones push</strong> — Promociones y novedades directo al celular</li>
</ul>

<p>🎯 <strong>Nuestro enfoque:</strong> No hacemos apps genéricas. Diseñamos soluciones <strong>pensadas específicamente para {industria}</strong>, entendiendo los desafíos de tu rubro.</p>

<p>¿Te gustaría explorar las posibilidades? Te invitamos a una <strong>reunión sin compromiso</strong> donde te mostramos prototipos y casos de éxito. 💼</p>

<p>¡Esperamos tu respuesta!</p>

<p>Saludos,<br>
<strong>Equipo de Desarrollo de Productos</strong> 🛠️</p>`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // EMAIL: PAQUETE COMPLETO (WEB + AUTOMATIZACIÓN + APP)
    // ═══════════════════════════════════════════════════
    {
      nombre: '🎯 Primer contacto - Transformación digital completa',
      descripcion: 'Oferta integral: web + automatizaciones + app. Para prospectos con alto potencial.',
      canal: 'EMAIL' as const,
      asunto: '🎯 {nombre} — Plan de transformación digital para tu negocio',
      cuerpo: `<h2>¡Hola {nombre}! 👋</h2>

<p>Estamos trabajando con varias empresas de <strong>{industria}</strong> en {ciudad} y queríamos presentarte algo que puede ser un <strong>antes y después</strong> para tu negocio. 🔥</p>

<p>Ofrecemos un <strong>plan integral de transformación digital</strong> que cubre todo lo que necesitás:</p>

<h3>🌐 Presencia Digital</h3>
<ul>
  <li>Sitio web profesional con diseño premium</li>
  <li>SEO para aparecer primero en Google</li>
  <li>Gestión de redes sociales integrada</li>
</ul>

<h3>🤖 Automatización</h3>
<ul>
  <li>Chatbot inteligente para atención 24/7</li>
  <li>Flujos automáticos de ventas y seguimiento</li>
  <li>Integración con tus herramientas actuales</li>
</ul>

<h3>📱 Plataforma / App</h3>
<ul>
  <li>App o portal de clientes personalizado</li>
  <li>Sistema de gestión interno</li>
  <li>Dashboard de métricas en tiempo real</li>
</ul>

<p>💰 <strong>Lo mejor:</strong> Trabajamos con <strong>planes escalables</strong>. Podés empezar con lo que más necesitás hoy y ir sumando módulos a medida que crecés.</p>

<p>📞 ¿Podemos agendar una <strong>videollamada de 20 minutos</strong> para mostrarte un plan pensado para tu negocio? Es sin compromiso y 100% personalizado.</p>

<p>¡Esperamos charlar pronto!</p>

<p>Saludos,<br>
<strong>Equipo de Transformación Digital</strong> 🚀</p>`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // EMAIL: SEGUIMIENTO POST PRIMER CONTACTO
    // ═══════════════════════════════════════════════════
    {
      nombre: '🔄 Seguimiento - Segundo contacto',
      descripcion: 'Para clientes que no respondieron al primer email. Tono más directo y breve.',
      canal: 'EMAIL' as const,
      asunto: 'Re: {nombre} — ¿Pudiste ver nuestro email anterior?',
      cuerpo: `<p>¡Hola {nombre}! 👋</p>

<p>Te escribimos hace unos días y queríamos asegurarnos de que hayas recibido nuestro mensaje.</p>

<p>Sabemos que estás ocupado/a con tu negocio en <strong>{industria}</strong>, así que vamos al grano:</p>

<p>👉 Ofrecemos una <strong>consulta gratuita de 15 minutos</strong> para mostrarte cómo podemos ayudarte a crecer digitalmente.</p>

<p><strong>¿Qué ganás?</strong></p>
<ul>
  <li>🔍 Un diagnóstico rápido de tu presencia digital actual</li>
  <li>💡 Ideas concretas para mejorar</li>
  <li>📋 Un presupuesto sin compromiso</li>
</ul>

<p>Solo respondé <strong>"Me interesa"</strong> y coordinamos. 📅</p>

<p>Saludos,<br>
<strong>Equipo de Desarrollo</strong></p>`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // WHATSAPP: PRIMER CONTACTO - CON SITIO WEB
    // ═══════════════════════════════════════════════════
    {
      nombre: '🌐 WhatsApp - Con sitio web',
      descripcion: 'Primer contacto por WhatsApp para clientes con sitio web existente.',
      canal: 'WHATSAPP' as const,
      asunto: null,
      cuerpo: `¡Hola {nombre}! 👋

Soy del equipo de desarrollo digital. Estuvimos viendo tu sitio web y nos encantó lo que hacés en {industria}. 🚀

Te escribo porque tenemos ideas para mejorar tu presencia online:
✨ Diseño moderno
📱 Optimización mobile
⚡ Velocidad y SEO
📊 Métricas de rendimiento

¿Te interesaría que te hagamos un análisis gratuito de tu sitio? 💡

Sin compromiso, te mostramos oportunidades concretas de mejora.

¡Esperamos tu respuesta! 😊`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // WHATSAPP: PRIMER CONTACTO - SIN SITIO WEB
    // ═══════════════════════════════════════════════════
    {
      nombre: '🆕 WhatsApp - Sin sitio web',
      descripcion: 'Primer contacto por WhatsApp para clientes sin presencia web.',
      canal: 'WHATSAPP' as const,
      asunto: null,
      cuerpo: `¡Hola {nombre}! 👋

Somos un equipo de desarrollo digital que trabaja con empresas de {industria} en {ciudad}.

¿Sabías que el 87% de los consumidores buscan online antes de comprar? 📱

Podemos crear para tu negocio:
🎨 Sitio web profesional
📱 Perfecto en celulares
🔍 Optimizado para Google
💬 WhatsApp integrado
📧 Email profesional

🎁 Te ofrecemos una consulta gratuita para mostrarte cómo se vería tu sitio.

¿Te interesa? ¡Contanos y coordinamos! 😊`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // WHATSAPP: AUTOMATIZACIONES
    // ═══════════════════════════════════════════════════
    {
      nombre: '🤖 WhatsApp - Automatizaciones',
      descripcion: 'Primer contacto por WhatsApp ofreciendo automatizaciones.',
      canal: 'WHATSAPP' as const,
      asunto: null,
      cuerpo: `¡Hola {nombre}! 👋

¿Cuántas horas por semana perdés en tareas repetitivas? ⏰

Ayudamos a empresas de {industria} a automatizar:
🤖 Chatbots 24/7 (WhatsApp, Instagram, web)
📋 Flujos automáticos de trabajo
📊 Reportes que se generan solos
🔗 Integraciones entre sistemas
📧 Email marketing inteligente

💡 Caso real: Una empresa de {industria} redujo un 70% su tiempo administrativo.

¿Te hacemos una consultoría gratuita de 30 min para ver qué procesos podemos automatizar? 🎯

¡Esperamos tu respuesta!`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // WHATSAPP: APPS Y PLATAFORMAS
    // ═══════════════════════════════════════════════════
    {
      nombre: '📱 WhatsApp - Apps y plataformas',
      descripcion: 'Primer contacto por WhatsApp ofreciendo apps y sistemas a medida.',
      canal: 'WHATSAPP' as const,
      asunto: null,
      cuerpo: `¡Hola {nombre}! 👋

Las mejores empresas de {industria} ya tienen su propia app o plataforma digital. 📱🚀

Desarrollamos:
📱 Apps móviles (iOS + Android)
🖥️ Plataformas web a medida
🛒 E-commerce avanzado
👥 Portales de clientes
📋 Sistemas de gestión
🔔 Notificaciones push

🎯 No hacemos apps genéricas — diseñamos soluciones pensadas para {industria}.

¿Te gustaría ver ejemplos y posibilidades para tu negocio? Te invitamos a una reunión rápida sin compromiso. 💼

¡Contanos y agendamos! 😊`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // WHATSAPP: TRANSFORMACIÓN DIGITAL COMPLETA
    // ═══════════════════════════════════════════════════
    {
      nombre: '🎯 WhatsApp - Transformación digital',
      descripcion: 'Contacto por WhatsApp con oferta integral: web + auto + app.',
      canal: 'WHATSAPP' as const,
      asunto: null,
      cuerpo: `¡Hola {nombre}! 👋

Trabajamos con empresas de {industria} en {ciudad} y tenemos un plan integral de transformación digital. 🔥

🌐 *Presencia Digital*
Web profesional + SEO + Redes

🤖 *Automatización*
Chatbot 24/7 + Flujos automáticos + Integraciones

📱 *App / Plataforma*
Sistema a medida + Portal de clientes + Dashboard

💰 Planes escalables: empezá con lo que más necesitás.

¿Podemos hacer una videollamada de 20 min para mostrarte un plan para tu negocio? 📞

¡Sin compromiso! Esperamos tu respuesta 🚀`,
      esActiva: true,
    },

    // ═══════════════════════════════════════════════════
    // WHATSAPP: SEGUIMIENTO
    // ═══════════════════════════════════════════════════
    {
      nombre: '🔄 WhatsApp - Seguimiento',
      descripcion: 'Segundo contacto por WhatsApp, breve y directo.',
      canal: 'WHATSAPP' as const,
      asunto: null,
      cuerpo: `¡Hola {nombre}! 👋

Te escribimos hace unos días sobre servicios digitales para tu negocio de {industria}.

¿Pudiste verlo? Solo queríamos saber si te interesa una consulta gratuita de 15 min. 🎯

🔍 Diagnóstico de tu presencia digital
💡 Ideas concretas de mejora
📋 Presupuesto sin compromiso

Respondé "Me interesa" y coordinamos. 📅

¡Saludos! 😊`,
      esActiva: true,
    },
  ];

  console.log(`\n📝 Creando ${plantillas.length} plantillas...`);

  for (const plantilla of plantillas) {
    await prisma.plantillaContacto.create({
      data: {
        ...plantilla,
        creadoPorId: admin.id,
      },
    });
    console.log(`  ✅ ${plantilla.nombre}`);
  }

  console.log(`\n🎉 ¡${plantillas.length} plantillas creadas exitosamente!`);

  // Summary
  const emailCount = plantillas.filter(p => p.canal === 'EMAIL').length;
  const waCount = plantillas.filter(p => p.canal === 'WHATSAPP').length;
  console.log(`\n📊 Resumen:`);
  console.log(`   📧 ${emailCount} plantillas de Email`);
  console.log(`   💬 ${waCount} plantillas de WhatsApp`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
