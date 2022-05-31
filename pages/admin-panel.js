import React from 'react';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { isHostAccount } from '../lib/collective.lib';
import roles from '../lib/constants/roles';
import { API_V2_CONTEXT, gqlV2 } from '../lib/graphql/helpers';

import { AdminPanelContext } from '../components/admin-panel/AdminPanelContext';
import AdminPanelSection from '../components/admin-panel/AdminPanelSection';
import { ALL_SECTIONS, SECTIONS_ACCESSIBLE_TO_ACCOUNTANTS } from '../components/admin-panel/constants';
import AdminPanelSideBar from '../components/admin-panel/SideBar';
import AdminPanelTopBar from '../components/admin-panel/TopBar';
import { collectiveNavbarFieldsFragment } from '../components/collective-page/graphql/fragments';
import { Flex, Grid } from '../components/Grid';
import MessageBox from '../components/MessageBox';
import NotificationBar from '../components/NotificationBar';
import Page from '../components/Page';
import SignInOrJoinFree from '../components/SignInOrJoinFree';
import { useUser } from '../components/UserProvider';

export const adminPanelQuery = gqlV2/* GraphQL */ `
  query AdminPanel($slug: String!) {
    account(slug: $slug) {
      id
      slug
      name
      isHost
      type
      settings
      isArchived
      isIncognito
      imageUrl(height: 256)
      features {
        ...NavbarFields
        VIRTUAL_CARDS
        USE_PAYMENT_METHODS
        EMIT_GIFT_CARDS
      }
      ... on AccountWithParent {
        parent {
          id
          slug
        }
      }
      ... on AccountWithHost {
        hostFeePercent
        host {
          id
          slug
          name
          settings
          policies
        }
      }
      ... on AccountWithHost {
        isApproved
      }
    }
  }
  ${collectiveNavbarFieldsFragment}
`;

const messages = defineMessages({
  collectiveIsArchived: {
    id: 'collective.isArchived',
    defaultMessage: '{name} has been archived.',
  },
  collectiveIsArchivedDescription: {
    id: 'collective.isArchived.edit.description',
    defaultMessage: 'This {type} has been archived and is no longer active.',
  },
  userIsArchived: {
    id: 'user.isArchived',
    defaultMessage: 'Account has been archived.',
  },
  userIsArchivedDescription: {
    id: 'user.isArchived.edit.description',
    defaultMessage: 'This account has been archived is no longer active.',
  },
});

const getDefaultSectionForAccount = (account, loggedInUser) => {
  if (!account) {
    return ALL_SECTIONS.INFO;
  }

  const isAdmin = loggedInUser?.canEditCollective(account);
  const isAccountant = loggedInUser?.hasRole(roles.ACCOUNTANT, account);
  const isAccountantOnly = !isAdmin && isAccountant;
  if (isHostAccount(account)) {
    return isAccountantOnly ? ALL_SECTIONS.REPORTS : ALL_SECTIONS.EXPENSES;
  } else {
    return isAccountantOnly ? ALL_SECTIONS.PAYMENT_RECEIPTS : ALL_SECTIONS.INFO;
  }
};

const getNotification = (intl, account) => {
  if (account?.isArchived) {
    const notification = { status: 'collectiveArchived' };
    if (account.type === 'USER') {
      return {
        ...notification,
        title: intl.formatMessage(messages.userIsArchived),
        description: intl.formatMessage(messages.userIsArchivedDescription),
      };
    } else {
      return {
        ...notification,
        title: intl.formatMessage(messages.collectiveIsArchived, { name: account.name }),
        description: intl.formatMessage(messages.collectiveIsArchivedDescription, {
          type: account.type.toLowerCase(),
        }),
      };
    }
  }
};

function getBlocker(LoggedInUser, account, section) {
  if (!LoggedInUser) {
    return <FormattedMessage id="mustBeLoggedIn" defaultMessage="You must be logged in to see this page" />;
  } else if (!account) {
    return <FormattedMessage defaultMessage="This account doesn't exist" />;
  } else if (account.isIncognito) {
    return <FormattedMessage defaultMessage="You cannot edit this collective" />;
  }

  // Check permissions
  const isAdmin = LoggedInUser.canEditCollective(account);
  if (SECTIONS_ACCESSIBLE_TO_ACCOUNTANTS.includes(section)) {
    if (!isAdmin && !LoggedInUser.hasRole(roles.ACCOUNTANT, account)) {
      return <FormattedMessage defaultMessage="You need to be logged in as an admin or accountant to view this page" />;
    }
  } else if (!isAdmin) {
    return <FormattedMessage defaultMessage="You need to be logged in as an admin" />;
  }
}

const getIsAccountantOnly = (LoggedInUser, account) => {
  return LoggedInUser && !LoggedInUser.canEditCollective(account) && LoggedInUser.hasRole(roles.ACCOUNTANT, account);
};

const AdminPanelPage = () => {
  const router = useRouter();
  const { slug, section } = router.query;
  const intl = useIntl();
  const { LoggedInUser, loadingLoggedInUser } = useUser();
  const { data, loading } = useQuery(adminPanelQuery, { context: API_V2_CONTEXT, variables: { slug } });

  const account = data?.account;
  const notification = getNotification(intl, account);
  const selectedSection = section || getDefaultSectionForAccount(account, LoggedInUser);
  const isLoading = loading || loadingLoggedInUser;
  const blocker = !isLoading && getBlocker(LoggedInUser, account, selectedSection);
  const titleBase = account?.isHost
    ? intl.formatMessage({ id: 'AdminPanel.button', defaultMessage: 'Admin' })
    : intl.formatMessage({ id: 'Settings', defaultMessage: 'Settings' });

  return (
    <AdminPanelContext.Provider value={{ selectedSection }}>
      <Page noRobots collective={account} title={account ? `${account.name} - ${titleBase}` : titleBase}>
        {!blocker && (
          <AdminPanelTopBar
            isLoading={isLoading}
            collective={data?.account}
            collectiveSlug={slug}
            selectedSection={selectedSection}
            display={['flex', null, 'none']}
          />
        )}
        {Boolean(notification) && (
          <NotificationBar
            status={notification.status}
            title={notification.title}
            description={notification.description}
          />
        )}
        {blocker ? (
          <Flex flexDirection="column" alignItems="center" my={6}>
            <MessageBox type="warning" mb={4} maxWidth={400} withIcon>
              {blocker}
            </MessageBox>
            {!LoggedInUser && <SignInOrJoinFree form="signin" disableSignup />}
          </Flex>
        ) : (
          <Grid
            gridTemplateColumns={['1fr', null, '208px 1fr']}
            maxWidth={1280}
            minHeight={600}
            gridGap={56}
            m="0 auto"
            px={3}
            py={4}
          >
            <AdminPanelSideBar
              isLoading={isLoading}
              collective={account}
              selectedSection={selectedSection}
              display={['none', null, 'block']}
              isAccountantOnly={getIsAccountantOnly(LoggedInUser, account)}
            />
            <AdminPanelSection section={selectedSection} isLoading={isLoading} collective={account} />
          </Grid>
        )}
        ;
      </Page>
    </AdminPanelContext.Provider>
  );
};

AdminPanelPage.getInitialProps = () => {
  return {
    scripts: { googleMaps: true }, // TODO: This should be enabled only for events
  };
};

export default AdminPanelPage;
