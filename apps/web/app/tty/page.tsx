import { ExamplePage } from "../example-page"
import { getExample } from "../example-data"

export const dynamic = "force-dynamic"

export default function TTYPage() {
  return <ExamplePage example={getExample("tty")} />
}
