// Dynamic records are shared by the demo, modal payloads and the JSON workspace API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export type Workspace = {
  user: { id: string; name: string };
  rooms: Row[];
  members: Row[];
  resources: Row[];
  completions: Row[];
  checkins: Row[];
  reactions: Row[];
  sessions: Row[];
  plans: Row[];
};
export const emptyWorkspace: Workspace = {
  user: { id: "", name: "" },
  rooms: [],
  members: [],
  resources: [],
  completions: [],
  checkins: [],
  reactions: [],
  sessions: [],
  plans: [],
};
export function createDemo(): Workspace {
  const now = new Date();
  const ago = (days: number, hours = 0) =>
    new Date(now.getTime() - days * 86400000 - hours * 3600000).toISOString();
  const future = (days: number, hours = 19) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hours, 0, 0, 0);
    if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
    return d.toISOString();
  };
  const members = [
    ["joseph", "Joseph"],
    ["sarah", "Sarah"],
    ["kevin", "Kévin"],
    ["emmanuel", "Emmanuel"],
    ["amina", "Amina"],
  ];
  const resources = [
    {
      id: "aws",
      room_id: "cloud",
      title: "Les fondamentaux du cloud AWS",
      url: "https://docs.aws.amazon.com/",
      kind: "Formation",
      modules: [
        "Comprendre les modèles du cloud",
        "Les régions et zones de disponibilité",
        "IAM : utilisateurs et permissions",
        "Lancer sa première instance EC2",
        "Stocker des fichiers avec S3",
        "Construire un réseau VPC",
        "Relier EC2 et une base de données",
        "Déployer une petite application",
        "Comprendre la facturation",
        "Documenter son architecture",
      ],
      due_date: future(14).slice(0, 10),
      created_by: "joseph",
    },
    {
      id: "docker",
      room_id: "cloud",
      title: "Docker, de zéro au premier déploiement",
      url: "https://docs.docker.com/get-started/",
      kind: "Playlist",
      modules: [
        "Images et conteneurs",
        "Écrire son Dockerfile",
        "Volumes et réseaux",
        "Docker Compose",
        "Déployer et documenter",
      ],
      due_date: future(8).slice(0, 10),
      created_by: "kevin",
    },
    {
      id: "react",
      room_id: "frontend",
      title: "Construire avec React & TypeScript",
      url: "https://react.dev/learn",
      kind: "Parcours",
      modules: [
        "Découper son interface",
        "Props et composants",
        "Gérer les événements",
        "État et hooks",
        "Typer les composants",
        "Charger des données",
        "Construire un formulaire",
        "Livrer une mini-application",
      ],
      due_date: future(21).slice(0, 10),
      created_by: "sarah",
    },
  ];
  const completions: Row[] = [];
  for (const [uid, count] of [
    ["joseph", 6],
    ["kevin", 5],
    ["sarah", 7],
    ["emmanuel", 3],
    ["amina", 4],
  ] as [string, number][]) {
    for (let i = 0; i < count; i++)
      completions.push({
        resource_id: "aws",
        user_id: uid,
        module_index: i,
        created_at: ago(i % 6),
      });
  }
  for (let i = 0; i < 3; i++)
    completions.push({
      resource_id: "docker",
      user_id: "joseph",
      module_index: i,
      created_at: ago(i + 1),
    });
  for (let i = 0; i < 3; i++)
    completions.push({
      resource_id: "react",
      user_id: "joseph",
      module_index: i,
      created_at: ago(i + 1),
    });
  const sessions: Row[] = [];
  for (let d = 0; d < 28; d++) {
    if (d % 7 !== 6)
      for (let m = 0; m < 5; m++)
        sessions.push({
          id: `session-${d}-${m}`,
          room_id: m % 3 ? "cloud" : "frontend",
          user_id: members[m][0],
          resource_id: "aws",
          seconds: (25 + ((d * 13 + m * 7) % 70)) * 60,
          created_at: ago(d),
        });
  }
  return {
    user: { id: "joseph", name: "Joseph" },
    rooms: [
      {
        id: "cloud",
        name: "Cloud & DevOps",
        description:
          "Du premier conteneur au cloud. On apprend, on pratique, on déploie.",
        topic: "Cloud & DevOps",
        color: "blue",
        invite: "demo-cloud",
        owner: "joseph",
        created_at: ago(20),
      },
      {
        id: "frontend",
        name: "Frontend builders",
        description:
          "Des interfaces qu’on est fiers de livrer. Un projet à la fois.",
        topic: "Frontend",
        color: "violet",
        invite: "demo-frontend",
        owner: "sarah",
        created_at: ago(15),
      },
    ],
    members: [
      ...members.map(([user_id, name]) => ({
        user_id,
        name,
        room_id: "cloud",
        joined_at: ago(20),
      })),
      ...members
        .slice(0, 3)
        .map(([user_id, name]) => ({
          user_id,
          name,
          room_id: "frontend",
          joined_at: ago(15),
        })),
    ],
    resources,
    completions,
    sessions,
    checkins: [
      {
        id: "post1",
        room_id: "cloud",
        user_id: "sarah",
        name: "Sarah",
        resource_id: "aws",
        text: "Premier déploiement sur EC2 ! J’ai enfin compris la différence entre un security group et une NACL. Petit schéma d’architecture terminé aussi.",
        link: "https://docs.aws.amazon.com/",
        created_at: ago(0, 1),
        approved_by: "kevin",
      },
      {
        id: "post2",
        room_id: "cloud",
        user_id: "kevin",
        name: "Kévin",
        resource_id: "docker",
        text: "Docker Compose, c’est validé. Mon API et ma base tournent ensemble. Prochain défi : mettre tout ça en ligne. Qui est chaud pour une session ce soir ?",
        link: "",
        created_at: ago(0, 3),
        approved_by: null,
      },
      {
        id: "post3",
        room_id: "frontend",
        user_id: "joseph",
        name: "Joseph",
        resource_id: "react",
        text: "Les composants et les props sont beaucoup plus clairs après un peu de pratique. J’ai découpé mon dashboard en petits composants réutilisables.",
        link: "",
        created_at: ago(1),
        approved_by: null,
      },
    ],
    reactions: [
      { checkin_id: "post1", user_id: "kevin" },
      { checkin_id: "post1", user_id: "amina" },
      { checkin_id: "post2", user_id: "sarah" },
    ],
    plans: [
      {
        id: "plan1",
        room_id: "cloud",
        user_id: "joseph",
        title: "Session cloud : on déploie ensemble",
        starts_at: future(0),
        minutes: 45,
      },
      {
        id: "plan2",
        room_id: "frontend",
        user_id: "sarah",
        title: "Build & review — mini-projet React",
        starts_at: future(1),
        minutes: 60,
      },
    ],
  };
}
