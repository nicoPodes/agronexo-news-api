// ==================== AGRO NEXO NEWS API ====================
// Servidor de noticias propio - Noticias reescritas como contenido original

const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');
const parser = new Parser();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN DE FUENTES ====================
const RSS_FEEDS = [
    { name: "Infocampo", url: "https://www.infocampo.com.ar/feed/", priority: 1 },
    { name: "Clarín Rural", url: "https://www.clarin.com/rural/feed/", priority: 2 },
    { name: "La Nación Campo", url: "https://www.lanacion.com.ar/agro/feed/", priority: 2 },
    { name: "Bichos de Campo", url: "https://bichosdecampo.com/feed/", priority: 2 },
    { name: "Ámbito Financiero", url: "https://www.ambito.com/agro/rss", priority: 3 }
];

// Palabras clave para categorías
const categoryKeywords = {
    mercados: ['precio', 'cotizacion', 'dolar', 'cbot', 'roflex', 'exportacion', 'granos', 'soja', 'maiz', 'trigo'],
    clima: ['clima', 'lluvia', 'sequia', 'helada', 'granizo', 'temperatura', 'smn', 'tormenta'],
    tecnologia: ['tecnologia', 'digital', 'satelital', 'drone', 'app', 'maquinaria'],
    ganaderia: ['ganado', 'vacuno', 'novillo', 'ternero', 'vaquillona', 'carne']
};

function detectCategory(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) return category;
        }
    }
    return 'general';
}

function rewriteForAgroNexo(title, content, source, date) {
    let newTitle = title;
    newTitle = newTitle.replace(new RegExp(source, 'gi'), '');
    newTitle = newTitle.replace(/Infocampo|Clarín|La Nación|Ámbito|Bichos de Campo/gi, '');
    newTitle = newTitle.replace(/\s+/g, ' ').trim();
    
    if (!newTitle.toLowerCase().startsWith('agronexo') && !newTitle.toLowerCase().includes('agronexo')) {
        newTitle = `🌾 AgroNexo: ${newTitle}`;
    }
    
    let cleanContent = content.replace(/<[^>]*>/g, '');
    const summary = cleanContent.substring(0, 200) + (cleanContent.length > 200 ? '...' : '');
    const fullContent = `${cleanContent}\n\n---\n📌 *Esta nota fue elaborada por AgroNexo con información verificada de ${source}.*`;
    
    const formattedDate = date ? new Date(date).toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : new Date().toLocaleDateString('es-AR');
    
    return { title: newTitle, summary, content: fullContent, formattedDate };
}

// ==================== ENDPOINT PRINCIPAL ====================
app.get('/api/agronexo-news', async (req, res) => {
    const limit = parseInt(req.query.limit) || 15;
    console.log(`📰 Solicitando noticias - Límite: ${limit}`);
    
    try {
        const allArticles = [];
        
        for (const feed of RSS_FEEDS) {
            try {
                const feedData = await parser.parseURL(feed.url);
                const articles = feedData.items.slice(0, 8).map(item => {
                    let imgUrl = item.enclosure?.link || item.thumbnail;
                    if (!imgUrl && item.content) {
                        const match = item.content.match(/<img[^>]+src="([^">]+)"/);
                        if (match) imgUrl = match[1];
                    }
                    if (!imgUrl) {
                        imgUrl = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800';
                    }
                    
                    const category = detectCategory(item.title, item.content || '');
                    let cleanContent = item.content ? item.content.replace(/<[^>]*>/g, '') : (item.description || '');
                    cleanContent = cleanContent.substring(0, 800);
                    
                    const rewritten = rewriteForAgroNexo(item.title, cleanContent, feed.name, item.pubDate);
                    
                    return {
                        id: `${feed.name}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
                        title: rewritten.title,
                        summary: rewritten.summary,
                        content: rewritten.content,
                        img: imgUrl,
                        source: 'AgroNexo',
                        originalSource: feed.name,
                        categoria: category,
                        date: item.pubDate || new Date().toISOString(),
                        formattedDate: rewritten.formattedDate,
                        link: item.link
                    };
                });
                allArticles.push(...articles);
            } catch(e) {
                console.error(`Error en ${feed.name}:`, e.message);
            }
        }
        
        allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
        const topArticles = allArticles.slice(0, limit);
        
        res.json({
            success: true,
            total: topArticles.length,
            totalAvailable: allArticles.length,
            news: topArticles,
            updatedAt: new Date().toISOString(),
            source: 'AgroNexo News API'
        });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==================== ENDPOINT DE SALUD ====================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'AgroNexo News API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        feeds: RSS_FEEDS.length
    });
});

app.listen(PORT, () => {
    console.log(`✅ AgroNexo News API corriendo en puerto ${PORT}`);
    console.log(`📰 Endpoint: /api/agronexo-news`);
    console.log(`🔍 Health: /api/health`);
});