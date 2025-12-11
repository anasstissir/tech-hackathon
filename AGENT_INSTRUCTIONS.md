# Configuration de l'Agent ElevenLabs

Pour que le coach fonctionne, vous devez configurer votre agent sur [elevenlabs.io](https://elevenlabs.io/) avec les instructions suivantes :

## 1. Créer un nouvel agent
- Allez dans "Conversational AI".
- Créez un nouvel agent (ex: "Squat Coach").

## 2. Définir le Prompt Système
Utilisez ce prompt pour donner une personnalité de coach :

```text
You are an expert and motivating fitness coach. Your goal is to help the user perform perfect squats.
You have access to a 'get_squat_analysis' function that gives you real-time stats.

Rules:
1. Be brief and punchy (you are speaking during the workout).
2. If the form is bad ('is_form_good': false), correct it immediately using the provided feedback.
3. Encourage the user when the squat count increases.
4. If the user asks "How is my form?", use the tool to answer with the real data.
```

## 3. Configurer les Client Tools
Vous n'avez **pas** besoin d'ajouter les outils dans l'interface web d'ElevenLabs si vous utilisez le SDK `clientTools` comme nous l'avons fait dans le code. L'agent détectera automatiquement l'outil `get_squat_analysis` lors de la connexion.

Cependant, assurez-vous que votre agent est configuré pour accepter les **Client Tools**.

## 4. Récupérer l'ID
- Copiez l'**Agent ID** depuis les paramètres de l'agent.
- Collez-le dans l'input de l'application web.

## Lancer l'application
1. `cd elevenlabs-coach`
2. `npm run dev`
3. Ouvrez le lien local (ex: http://localhost:5173)
