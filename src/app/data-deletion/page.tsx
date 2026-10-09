import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { metaDeletionByCode } from "@/lib/store";
import { ROOT_DOMAIN } from "@/lib/tenants";

export const metadata: Metadata = {
  title: "Удаление данных — Orbis System",
  description:
    "Как удалить данные из Orbis System: что именно удаляется, за какой срок и как проверить исполнение заявки.",
};

// Страница показывает состояние конкретной заявки — кэшировать нельзя.
export const dynamic = "force-dynamic";

/**
 * Удаление данных.
 *
 * Обязательна для проверки Meta и обязана открываться без входа. Отказы на
 * проверке чаще всего получают страницы с одной строчкой «напишите нам» —
 * поэтому здесь сказано, что именно удаляется, за какой срок и как
 * проверить исполнение.
 *
 * Со ссылкой `?code=` страница работает ещё и подтверждением: по этому
 * коду человек, нажавший «удалить данные» в настройках Facebook, видит,
 * что заявка принята и что по ней сделано.
 */
export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = String(params.code ?? "").trim().toUpperCase();
  const record = code ? metaDeletionByCode(code) : undefined;

  return (
    <LegalPage title="Удаление данных" updated="Действует с 7 октября 2026 года">
      {code ? (
        <section
          className="mb-10 rounded-[12px] border px-5 py-4"
          style={{
            borderColor: record ? "var(--color-hairline)" : "rgb(224 179 65 / 0.35)",
            background: "var(--color-surface-1)",
          }}
        >
          {record ? (
            <>
              <div className="t-body-sm font-semibold">Заявка принята</div>
              <div className="t-caption mt-2 leading-relaxed text-ink-muted">
                Код заявки <span className="t-num">{record.code}</span>, принята{" "}
                {record.at.slice(0, 10)}.{" "}
                {record.removed
                  ? `Доступ к ${record.removed} ${
                      record.removed === 1 ? "странице" : "страницам"
                    } Facebook снят, токены удалены.`
                  : "Подключений Facebook на вашем аккаунте не было — снимать было нечего."}{" "}
                Остальные данные, если они есть, стираются в течение 30 дней.
              </div>
            </>
          ) : (
            <>
              <div className="t-body-sm font-semibold">Заявка с таким кодом не найдена</div>
              <div className="t-caption mt-2 leading-relaxed text-ink-muted">
                Проверьте код — возможно, в нём опечатка. Если заявка подавалась давно,
                напишите нам, и мы найдём её вручную.
              </div>
            </>
          )}
        </section>
      ) : null}

      <LegalSection title="Что удаляется">
        <p>
          <b>Доступ к странице Facebook.</b> Токены, которыми система забирала заявки
          из рекламных форм, стираются немедленно. После этого новые заявки с этой
          страницы в систему не приходят.
        </p>
        <p>
          <b>Данные заявки.</b> Имя, телефон, почта и ответы на вопросы формы, которые
          вы оставили в рекламе агентства, вместе с историей обращения.
        </p>
        <p>
          <b>Записи журнала</b> о приходах с вашего аккаунта.
        </p>
        <p>
          Данные, которые закон обязывает хранить (например, бухгалтерские документы по
          уже оплаченному договору), остаются на срок, установленный законом, и не
          используются ни для чего другого.
        </p>
      </LegalSection>

      <LegalSection title="Способ 1. Через настройки Facebook">
        <p>Если вы давали доступ к странице через вход в Facebook:</p>
        <p>
          1. Откройте Facebook → <b>Настройки и конфиденциальность</b> →{" "}
          <b>Настройки</b> → <b>Приложения и сайты</b>.
          <br />
          2. Найдите в списке <b>Orbis System</b>.
          <br />
          3. Нажмите <b>Удалить</b> и подтвердите удаление данных.
        </p>
        <p>
          Facebook сообщит нам об этом сам. Доступ снимется сразу, а вы получите код
          заявки — по нему эта страница покажет, что именно сделано.
        </p>
      </LegalSection>

      <LegalSection title="Способ 2. Напрямую нам">
        <p>
          Напишите на{" "}
          <a href={`mailto:privacy@${ROOT_DOMAIN}`} className="text-ink underline">
            privacy@{ROOT_DOMAIN}
          </a>{" "}
          с темой <b>«Удаление данных»</b> и укажите:
        </p>
        <p>
          — телефон или электронную почту, которые вы оставляли в заявке;
          <br />
          — название агентства, если помните;
          <br />— примерную дату обращения.
        </p>
        <p>
          Этого достаточно, чтобы найти запись. Паспорт и прочие документы мы не
          спрашиваем.
        </p>
      </LegalSection>

      <LegalSection title="Сроки">
        <p>
          Доступ к странице Facebook снимается <b>в тот же момент</b>, когда приходит
          заявка.
        </p>
        <p>
          Остальные данные удаляются <b>в течение 30 дней</b>. Подтверждение приходит на
          тот же адрес, с которого пришёл запрос.
        </p>
        <p>
          Из резервных копий данные уходят вместе с истечением срока хранения копий —
          не дольше 90 дней.
        </p>
      </LegalSection>

      <LegalSection title="Если заявку подало агентство">
        <p>
          Данные студента принадлежат агентству, которое их внесло. Если вы обращались в
          конкретное агентство, быстрее всего написать ему напрямую — оно удаляет
          карточку само, из своего портала.
        </p>
        <p>
          Не знаете, к какому именно, — напишите нам, мы найдём и передадим запрос.
        </p>
        <p>
          Что мы храним и зачем, описано в{" "}
          <Link href="/privacy" className="text-ink underline">
            политике конфиденциальности
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
