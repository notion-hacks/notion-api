# Notion API (Unofficial)

> A CLI tool and JavaScript library to help you interact with the Notion API.

This is really just a proof of concept how you can reverse-engineer the Notion API to read and write data to Notion programmatically.

## Documentation

After you clone this repo and run `npm install`, here are some of the things you can do.

```
❯❯❯ ./bin/notion-api

notion-api <command>

 login                           Log in to Notion
 user                            Get information about the logged in user
 spaces                          Get the user's spaces along with related information
 sidebar <spaceId>               Get a list of pages in the sidebar for a given space
 get <table> <id>                Get a record from Notion
 set-title <blockId> <title>     Set a block title
```

You can login, which will save your authentication cookies to the `cookies.json` file.

```
❯❯❯ ./bin/notion-api login
? Email: steve@apple.com
✔ Sending temporary password
? Password: tern-dee-lund-tub
✔ Logging in
```

You can see information about the logged in user.

```
❯❯❯ ./bin/notion-api user
{ id: '9a51f675-e2e2-46e5-8bcd-6bc535c7e7c0',
  email: 'steve@apple.com',
  given_name: 'Steve',
  family_name: 'Jobs',
  ... }
```

You can see a list of the spaces that the user is in.

```
❯❯❯ ./bin/notion-api spaces
[ { spaceView:
     { id: 'a304ffab-9230-4289-9108-5d6cfc6d9ab7',
       space_id: '6d702b09-8795-4385-abb3-dc6b3e8907d3',
       ... },
    spaceData:
     { name: "Steve's Workspace",
       ... } },
  ... ]
```

If you grab that spaceId, you can see the sidebar inside that space.

```
❯❯❯ ./bin/notion-api sidebar 6d702b09-8795-4385-abb3-dc6b3e8907d3
{ favorites:
   [ { id: '4ae34ac9-6bf7-47f5-a9e2-5290ea59eb82',
       type: 'page',
       properties:
        { title: [ [ 'Notes' ] ],},
       ... } ],
  workspace: [ ... ],
  shared: [ ... ],
  private: [ ... ] }
```

And you can edit the title of any block.

```
❯❯❯ ./bin/notion-api set-title 4ae34ac9-6bf7-47f5-a9e2-5290ea59eb82 'My Notes'
```

## Development

It's probably better to wait for an official API before doing some things:

- Rendering a Notion page requires building a bunch of renderers.
- Reactively listening to changes on the websocket looks like a pain.
