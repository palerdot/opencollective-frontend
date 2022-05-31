import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from '@apollo/client/react/hoc';
import { get } from 'lodash';
import { withRouter } from 'next/router';
import { FormattedMessage, injectIntl } from 'react-intl';

import { IGNORED_TAGS } from '../../lib/constants/collectives';
import { i18nGraphqlException } from '../../lib/errors';
import { API_V2_CONTEXT, gqlV2 } from '../../lib/graphql/helpers';

import { Box, Flex } from '../Grid';
import MessageBox from '../MessageBox';
import SignInOrJoinFree from '../SignInOrJoinFree';
import { H1, P } from '../Text';
import { withUser } from '../UserProvider';

import CollectiveCategoryPicker from './CollectiveCategoryPicker';
import ConnectGithub from './ConnectGithub';
import CreateCollectiveForm from './CreateCollectiveForm';
import CreateOpenSourceCollective from './CreateOpenSourceCollective';

class CreateCollective extends Component {
  static propTypes = {
    host: PropTypes.object,
    intl: PropTypes.object,
    LoggedInUser: PropTypes.object, // from withUser
    refetchLoggedInUser: PropTypes.func.isRequired, // from withUser
    router: PropTypes.object.isRequired, // from withRouter
    createCollective: PropTypes.func.isRequired, // addCreateCollectiveMutation
    data: PropTypes.shape({
      // from addTagStatsQuery
      tagStats: PropTypes.shape({
        nodes: PropTypes.arrayOf(
          PropTypes.shape({
            tag: PropTypes.string,
          }),
        ),
      }),
    }),
  };

  constructor(props) {
    super(props);

    this.state = {
      error: null,
      creating: false,
      githubInfo: null,
    };

    this.createCollective = this.createCollective.bind(this);
  }

  async createCollective({ collective, message, inviteMembers }) {
    // set state to loading
    this.setState({ creating: true });

    // prepare object
    collective.tags = collective.tags
      ? [...collective.tags, this.props.router.query.category]
      : [this.props.router.query.category];

    if (this.state.githubInfo) {
      collective.githubHandle = this.state.githubInfo.handle;
    }

    // try mutation
    try {
      const res = await this.props.createCollective({
        variables: {
          collective,
          host: this.props.host ? { slug: this.props.host.slug } : null,
          automateApprovalWithGithub: this.state.githubInfo ? true : false,
          message,
          inviteMembers: inviteMembers.map(invite => ({
            ...invite,
            memberAccount: { legacyId: invite.memberAccount.id },
          })),
        },
      });
      const newCollective = res.data.createCollective;
      await this.props.refetchLoggedInUser();
      this.props.router
        .push({
          pathname: `/${newCollective.slug}/onboarding`,
          query: {
            CollectiveId: newCollective.legacyId,
          },
        })
        .then(() => window.scrollTo(0, 0));
    } catch (err) {
      const errorMsg = i18nGraphqlException(this.props.intl, err);
      this.setState({ error: errorMsg, creating: false });
    }
  }

  render() {
    const { LoggedInUser, host, router, data } = this.props;
    const { error } = this.state;
    const { category, step, token } = router.query;
    const tags = data?.tagStats?.nodes?.filter(node => !IGNORED_TAGS.includes(node.tag));
    const popularTags = tags?.map(value => value.tag);

    if (host && !host.isOpenToApplications) {
      return (
        <Flex flexDirection="column" alignItems="center" mb={5} p={2}>
          <Flex flexDirection="column" p={4} mt={3}>
            <Box mb={3}>
              <H1 fontSize="32px" lineHeight="36px" fontWeight="bold" textAlign="center">
                <FormattedMessage id="home.create" defaultMessage="Create a Collective" />
              </H1>
            </Box>
          </Flex>
          <Flex alignItems="center" justifyContent="center">
            <MessageBox type="warning" withIcon mb={[1, 3]}>
              <FormattedMessage
                id="collectives.create.error.HostNotOpenToApplications"
                defaultMessage="This Fiscal Host is not open to applications"
              />
            </MessageBox>
          </Flex>
        </Flex>
      );
    }

    if (!LoggedInUser) {
      return (
        <Flex flexDirection="column" alignItems="center" mb={5} p={2}>
          <Flex flexDirection="column" p={4} mt={2}>
            <Box mb={3}>
              <H1 fontSize="32px" lineHeight="36px" fontWeight="bold" textAlign="center">
                <FormattedMessage id="collective.create.join" defaultMessage="Join Open Collective" />
              </H1>
            </Box>
            <Box textAlign="center">
              <P fontSize="14px" color="black.600" mb={1}>
                <FormattedMessage
                  id="collective.create.createOrSignIn"
                  defaultMessage="Create an account (or sign in) to start a collective."
                />
              </P>
            </Box>
          </Flex>
          <SignInOrJoinFree createProfileTabs={['personal']} />
        </Flex>
      );
    }

    if (!host && !category) {
      return <CollectiveCategoryPicker />;
    }

    if ((category === 'opensource' || get(host, 'slug') === 'opensource') && step !== 'form') {
      if (token) {
        return <ConnectGithub updateGithubInfo={githubInfo => this.setState({ githubInfo })} />;
      } else {
        return <CreateOpenSourceCollective />;
      }
    }

    return (
      <CreateCollectiveForm
        host={host}
        github={this.state.githubInfo}
        onSubmit={this.createCollective}
        onChange={this.handleChange}
        loading={this.state.creating}
        error={error}
        popularTags={popularTags}
        loggedInUser={LoggedInUser}
      />
    );
  }
}

const createCollectiveMutation = gqlV2/* GraphQL */ `
  mutation CreateCollective(
    $collective: CollectiveCreateInput!
    $host: AccountReferenceInput
    $automateApprovalWithGithub: Boolean
    $message: String
    $inviteMembers: [InviteMemberInput]
  ) {
    createCollective(
      collective: $collective
      host: $host
      automateApprovalWithGithub: $automateApprovalWithGithub
      message: $message
      inviteMembers: $inviteMembers
    ) {
      id
      name
      slug
      tags
      description
      githubHandle
      legacyId
    }
  }
`;

const tagStatsQuery = gqlV2/* GraphQL */ `
  query CreateCollectivePageQuery {
    tagStats {
      nodes {
        tag
      }
    }
  }
`;

const addCreateCollectiveMutation = graphql(createCollectiveMutation, {
  name: 'createCollective',
  options: { context: API_V2_CONTEXT },
});

const addTagStatsQuery = graphql(tagStatsQuery, {
  options: {
    context: API_V2_CONTEXT,
  },
});

export default withRouter(withUser(addCreateCollectiveMutation(addTagStatsQuery(injectIntl(CreateCollective)))));
