import type { Stay22Response } from "./schemas";

export function createStay22DemoFixture(currency: string): Stay22Response {
  return {
    meta: {
      page: 1,
      pageSize: 3,
      total: 3,
      hasMore: false,
      currency,
      nights: 1,
    },
    results: [
      {
        id: "demo-jfk-1",
        name: "Airport recovery stay",
        type: "Hotel",
        url: "https://www.stay22.com/",
        suppliers: {
          demo: {
            id: "demo-jfk-1",
            link: "https://www.stay22.com/",
            price: { total: 249 },
          },
        },
      },
      {
        id: "demo-jfk-2",
        name: "Queens value stay",
        type: "Hotel",
        url: "https://www.stay22.com/",
        suppliers: {
          demo: {
            id: "demo-jfk-2",
            link: "https://www.stay22.com/",
            price: { total: 219 },
          },
        },
      },
      {
        id: "demo-jfk-3",
        name: "Comfort-first airport stay",
        type: "Hotel",
        url: "https://www.stay22.com/",
        suppliers: {
          demo: {
            id: "demo-jfk-3",
            link: "https://www.stay22.com/",
            price: { total: 289 },
          },
        },
      },
    ],
  };
}
