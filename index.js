// ==================== AGRO NEXO NEWS API v2 ====================
const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');
const parser = new Parser();

const app = express();

// CONFIGURACIÓN DE SEGURIDAD (CORS)
app.use(cors()); 
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN DE FUENTES ====================
const RSS_FEEDS = [
    { name: "Infocampo", url: "https://www.infocampo.com.ar/feed/", category: "general", country: "Argentina", lang: "es" },
    { name: "Clarín Rural", url: "https://www.clarin.com/rural/feed/", category: "general", country: "Argentina", lang: "es" },
    { name: "La Nación Campo", url: "https://www.lanacion.com.ar/agro/feed/", category: "general", country: "Argentina", lang: "es" },
    { name: "Bichos de Campo", url: "https://bichosdecampo.com/feed/", category: "general", country: "Argentina", lang: "es" },
    { name: "Ámbito Financiero", url: "https://www.ambito.com/agro/rss", category: "mercados", country: "Argentina", lang: "es" },
    { name: "AgFunderNews", url: "https://agfundernews.com/feed", category: "tecnologia", country: "USA", lang: "en", translate: true },
    { name: "Future Farming", url: "https://www.futurefarming.com/feed/", category: "tecnologia", country: "Internacional", lang: "en", translate: true }
];

// ==================== LÓGICA DE CATEGORÍAS ====================
const categoryKeywords = {
    mercados: ['precio', 'cotizacion', 'dolar', 'cbot', 'roflex', 'granos', 'soja', 'maiz', 'trigo'],
    tecnologia: ['tecnologia', 'digital', 'satelital', 'drone', 'app', 'software', 'ia', 'robot'],
    clima: ['clima', 'lluvia', 'sequia', 'helada', 'smn', 'weather', 'rain'],
    ganaderia: ['ganado', 'vacuno', 'bovino', 'carne', 'leche', 'tambo', 'cattle']
};

function detectCategory(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) return category;
    }
    return 'general';
}

// ==================== ENDPOINT DE NOTICIAS ====================
app.get('/api/agronexo-news', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category || 'todas';
    
    try {
        const allArticles = [];
        for (const feed of RSS_FEEDS) {
            try {
                const feedData = await parser.parseURL(feed.url);
                const articles = feedData.items.slice(0, 5).map(item => {
                    const cleanContent = item.content ? item.content.replace(/<[^>]*>/g, '').substring(0, 400) : '';
                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        title: item.title,
                        summary: cleanContent.substring(0, 180) + '...',
                        content: cleanContent,
                        imageUrl: item.enclosure?.url || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800',
                        category: feed.category === 'general' ? detectCategory(item.title, cleanContent) : feed.category,
                        date: item.pubDate || new Date().toISOString(),
                        source: feed.name
                    };
                });
                allArticles.push(...articles);
            } catch (e) { console.error(`Error en ${feed.name}:`, e.message); }
        }

        allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
        const filtered = category === 'todas' ? allArticles : allArticles.filter(a => a.category.toLowerCase() === category.toLowerCase());
        
        res.json({ success: true, news: filtered.slice(0, limit) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.listen(PORT, () => console.log(`🚀 API AgroNexo corriendo en puerto ${PORT}`));