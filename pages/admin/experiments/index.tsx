import { User } from "@prisma/client"
import { GetServerSideProps } from "next"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { DiscordUser } from "../../../components/DiscordAvatar"
import FormattedLink from "../../../components/FormattedLink"
import { LoginInfo } from "../../../components/LoginInfo"
import { getExperiments, getUserFromCtx, isUser } from "../../../utils/db"
import { ExperimentInfo } from "../../../utils/types"
import { urlify } from "../../../utils/utils"

interface Props {
  user: User,
  experiments: ExperimentInfo[]
}

export default function ExperimentsPage({ user, experiments }: Props) {
  const desc = "Manage experiments"

  const router = useRouter()
  const [toast, setToast] = useState("")
  const [templateText, setTemplateText] = useState("")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")

  useEffect(() => {
    if (toast.length > 0) {
      const id = setTimeout(() => {
        setToast("")
      }, 10000)
      return () => clearTimeout(id)
    }
  }, [toast])

  async function update(file?: File) {
    if (!file) return
    if (file.size > 10_000_000) return
    const buffer = await file.arrayBuffer()
    const text = new TextDecoder().decode(buffer)
    setTemplateText(text)
  }

  return (
    <main className="max-w-5xl w-full px-1">
      <Head>
        <title>Manage experiments | The GUOBA Project</title>
        <meta name="twitter:card" content="summary" />
        <meta property="og:title" content="Manage experiments | The GUOBA Project" />
        <meta property="og:description" content={desc} />
        <meta name="description" content={desc} />
      </Head>

      <div className="text-sm breadcrumbs">
        <ul>
          <li><Link href={"/admin"}>Admin stuff</Link></li>
          <li>Experiment management</li>
        </ul>
      </div>
      <LoginInfo user={user} />

      <h3 className="text-xl font-semibold py-2">Experiments</h3>
      <table className="table table-zebra table-compact w-full table-auto">
        <thead>
          <tr>
            <th>ID</th>
            <th>Public</th>
            <th>Active</th>
            <th>Name</th>
            <th>Creator</th>
            <th>Character</th>
            <th>Processed</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {experiments.map(c => <tr key={c.id}>
            <th>
              {c.id}
            </th>
            <th>
              <input
                type="checkbox"
                className="checkbox checkbox-primary mx-3"
                disabled
                checked={c.public}
              />
            </th>
            <th>
              <input
                type="checkbox"
                className="checkbox checkbox-primary mx-3"
                disabled
                checked={c.active}
              />
            </th>
            <th>
              <FormattedLink href={`/experiments/${c.slug}`}>{c.name}</FormattedLink>
            </th>
            <th>
              <DiscordUser user={c.creator} />
            </th>
            <th>{c.character}</th>
            <th>{c._count.experimentData}</th>
            <th><FormattedLink href={`/admin/experiments/${c.id}`}><button className="btn btn-sm btn-primary">Edit</button></FormattedLink></th>
          </tr>)}
        </tbody>
      </table>

      <div className="divider" />
      <h3 className="text-xl font-semibold pb-2">Create experiment</h3>
      <div className="font-semibold">Template File</div>
      <div className="flex w-full tooltip tooltip-warning" data-tip="This cannot be edited once submitted!">
        <div
          className={"flex-grow rounded-box place-items-center"}
        >
          <textarea
            className={"textarea textarea-bordered w-full font-mono border-warning"}
            placeholder="Paste your template json here"
            value={templateText}
            onChange={e => setTemplateText(e.target.value)}
          />
        </div>
        <div className="divider divider-horizontal" />
        <label className="flex justify-center px-4 border-2 border-dashed rounded-md cursor-pointer appearance-none focus:outline-none"
          onDrop={e => {
            update(e.dataTransfer.files?.[0])
            e.preventDefault()
            e.stopPropagation()
          }}
          onDragOver={e => {
            e.preventDefault()
            e.stopPropagation()
          }}>
          <span className="flex items-center space-x-2">
            <span className="font-medium">
              Drop file, or click to browse
            </span>
          </span>
          <input
            type="file"
            id="file"
            className="hidden"
            accept=".json"
            onChange={e => update(e.target.files?.[0])}
          />
        </label>
      </div>


      <label className="cursor-pointer label justify-start" >
        <span className="font-semibold">Character (from file)</span>
        <input
          type="text"
          className={"input input-bordered input-sm w-full max-w-xs mx-3"}
          id="char"
          disabled
          value={getChar(templateText)}
        />
      </label>

      <label className="cursor-pointer label justify-start" >
        <span className="font-semibold">Name</span>
        <input
          type="text"
          className={"input input-bordered input-sm w-full max-w-xs mx-3"}
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </label>

      <label className="cursor-pointer label justify-start" >
        <span className="font-semibold">Slug (.../experiments/[slug])</span>
        <input
          type="text"
          className={"input input-bordered input-sm w-full max-w-xs mx-3"}
          placeholder={urlify(name, true)}
          value={slug}
          onChange={e => setSlug(e.target.value)}
        />
      </label>

      <button
        className={"btn btn-primary my-2"}
        onClick={async () => {
          try {
            const response = await (await fetch("/api/create-experiment", {
              method: "POST",
              body: JSON.stringify({
                name,
                slug: slug || urlify(name, true),
                char: getChar(templateText),
                template: JSON.parse(templateText).template
              })
            })).json()

            if (response.error) {
              setToast(response.error)
              return
            }
            if (response.ok) {
              router.reload()
              return
            }
            setToast("Unknown response")
          } catch (error) {
            setToast(`An error occurred while creating experiment:\n${error}`)
          }
        }}
      >
        Create experiment
      </button>

      {toast.length > 0 &&
        <div className="toast">
          <div className="alert alert-error">
            <div>
              <span>{toast}</span>
            </div>
          </div>
        </div>}
    </main>
  )
}

function getChar(text: string) {
  try {
    const json = JSON.parse(text)
    return json.char ?? "Unknown character"
  } catch (error) {
    return "No file provided"
  }
}

export const getServerSideProps: GetServerSideProps<Props> = async function (ctx) {
  const user = await getUserFromCtx<Props>(ctx)

  if (!isUser(user))
    return user

  if (!user.admin)
    return {
      redirect: {
        destination: "/",
        permanent: false
      }
    }


  return {
    props: {
      user,
      experiments: await getExperiments()
    }
  }
}
